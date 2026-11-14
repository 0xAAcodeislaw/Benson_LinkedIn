// Cloudflare Worker：静态资源 + 三语页面渲染 + 极简后台（/admin）。
//
// 路由：
//   /                     → 按 Accept-Language 跳转
//   /{lang}/              → 渲染页面（KV 缓存 HTML，保存后台时刷新）
//   /avatar               → KV 中的头像，缺失时回落到默认 SVG
//   /admin                → 登录页 / 编辑页
//   /api/*                → 内容与头像读写（除登录外均需会话）
//   /assets/*, /robots.txt, /sitemap.xml → 静态资源
import {
  LOCALES,
  loadContent,
  renderLocale,
  render404,
  getHtml,
  saveContent,
  loadAvatar,
  saveAvatar,
  deleteAvatar,
  loadImage,
  saveImage,
  deleteImage,
  loadPrevious,
  CONTENT_KEY,
  htmlKey,
} from "./render.js";
import { sharedSchema, localeSchema } from "../scripts/schema.mjs";
import { loginPage, editorPage } from "./admin/pages.js";

const COOKIE = "bd_admin";
const PASSWORD_KEY = "admin:hash";
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 天
const MAX_FAILS = 5;
const FAIL_WINDOW = 15 * 60; // 15 分钟

const enc = new TextEncoder();
const IMAGE_ID = /^[a-zA-Z0-9_-]{4,48}$/;

// 统一安全响应头
const SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://cloudflareinsights.com; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

// 给任意响应补上安全头（静态资源也走这里）
function harden(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

// 按文件头识别真实图片类型，避免 iOS 上 canvas 回退成 PNG 却标成 WebP
function sniffImageType(buffer) {
  const b = new Uint8Array(buffer.slice(0, 12));
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

// ---- 工具 --------------------------------------------------------------
const html = (body, status = 200, extra = {}) =>
  new Response(body, {
    status,
    headers: {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...SECURITY_HEADERS,
      ...extra,
    },
  });

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
    },
  });

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 常量时间比较，避免通过响应时间猜测
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 会话签名密钥绑定「密码哈希 + 吊销纪元」：改密码或点「退出所有设备」都会让旧 Cookie 失效
async function sessionKey(env) {
  const hash = await getPasswordHash(env);
  let epoch = "0";
  try {
    epoch = (await env.CONTENT.get("admin:epoch")) || "0";
  } catch {
    /* 忽略 */
  }
  return `${env.SESSION_SECRET || "insecure-dev-secret"}|${hash}|${epoch}`;
}

async function makeSession(env) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const sig = await hmac(await sessionKey(env), String(exp));
  return `${exp}.${sig}`;
}

async function isAuthed(request, env) {
  if (!env.SESSION_SECRET) return false;
  const value = parseCookies(request.headers.get("cookie"))[COOKIE];
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(await sessionKey(env), exp);
  return safeEqual(sig, expected);
}

// 密码哈希优先取 KV（后台可改），否则用部署时写入的 secret
async function getPasswordHash(env) {
  try {
    const stored = await env.CONTENT.get(PASSWORD_KEY);
    if (stored) return stored;
  } catch {
    /* 忽略 */
  }
  return env.ADMIN_PASSWORD_HASH || "";
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

// 写操作要求同源 + 自定义头，防 CSRF
function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // 同源表单提交可能不带 Origin，交给下面的 Referer/自定义头判断
  return origin === new URL(request.url).origin;
}

function isTrustedMutation(request) {
  return sameOrigin(request) && request.headers.get("x-admin-request") === "1";
}

// ---- 登录 ----------------------------------------------------------------
async function handleLogin(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const failKey = `fail:${ip}`;

  const failRaw = await env.CONTENT.get(failKey);
  const fails = Number(failRaw || 0);
  if (fails >= MAX_FAILS) {
    return html(loginPage({ error: "尝试次数过多，请 15 分钟后再试。" }), 429);
  }

  let password = "";
  let next = "/admin";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    password = body.password || "";
    next = body.next || "/admin";
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "");
    next = String(form.get("next") || "/admin");
  }

  const hash = await sha256Hex(password);
  const expected = await getPasswordHash(env);

  if (expected && safeEqual(hash, expected)) {
    await env.CONTENT.delete(failKey);
    const session = await makeSession(env);
    return new Response(null, {
      status: 302,
      headers: {
        location: next.startsWith("/") ? next : "/admin",
        "set-cookie": cookieHeader(session, SESSION_TTL),
        "cache-control": "no-store",
      },
    });
  }

  await env.CONTENT.put(failKey, String(fails + 1), { expirationTtl: FAIL_WINDOW });
  return html(loginPage({ error: "密码不正确。" }), 401);
}

// ---- API -----------------------------------------------------------------
async function handleApi(request, env, url) {
  const path = url.pathname;

  if (path === "/api/login" && request.method === "POST") return handleLogin(request, env);

  if (path === "/api/logout" && request.method === "POST") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": cookieHeader("", 0),
        "cache-control": "no-store",
      },
    });
  }

  // 以下接口都需要会话
  if (!(await isAuthed(request, env))) {
    return path === "/api/content" && request.method === "GET"
      ? json({ error: "unauthorized" }, 401)
      : json({ error: "unauthorized" }, 401);
  }

  if (path === "/api/content" && request.method === "GET") {
    const content = await loadContent(env);
    // 标签页文案跟随各语言的 label，后台改了立刻反映
    const tabs = [
      { key: "shared", label: "共享" },
      ...LOCALES.map((l) => ({
        key: l,
        label: (content.locales[l] && content.locales[l].label) || l.toUpperCase(),
      })),
    ];
    return json({ content, schema: { shared: sharedSchema, locale: localeSchema }, tabs });
  }

  if (path === "/api/content" && request.method === "PUT") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const body = await request.json().catch(() => null);
    const content = body && body.content;
    if (!content || !content.locales || !content.profile) return json({ error: "invalid content" }, 400);
    for (const lang of LOCALES) {
      if (!content.locales[lang]) return json({ error: `missing locale ${lang}` }, 400);
    }
    await saveContent(env, content);
    return json({ ok: true, savedAt: new Date().toISOString() });
  }

  if (path === "/api/avatar" && request.method === "POST") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) return json({ error: "too large" }, 413);
    const type = sniffImageType(bytes);
    if (!type) return json({ error: "unsupported type" }, 415);
    await saveAvatar(env, bytes, type);
    return json({ ok: true, type });
  }

  if (path === "/api/avatar" && request.method === "DELETE") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    await deleteAvatar(env);
    return json({ ok: true });
  }

  // 项目图片：POST /api/image?id=xxx 上传，DELETE 删除
  if (path === "/api/image") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const id = url.searchParams.get("id") || "";
    if (!IMAGE_ID.test(id)) return json({ error: "invalid id" }, 400);

    if (request.method === "POST") {
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > 2 * 1024 * 1024) return json({ error: "too large" }, 413);
      const type = sniffImageType(bytes);
      if (!type) return json({ error: "unsupported type" }, 415);
      await saveImage(env, id, bytes, type);
      return json({ ok: true, src: `/img/${id}`, type });
    }
    if (request.method === "DELETE") {
      await deleteImage(env, id);
      return json({ ok: true });
    }
  }

  // 导出当前内容（备份）
  if (path === "/api/export" && request.method === "GET") {
    const content = await loadContent(env);
    return new Response(JSON.stringify(content, null, 2), {
      headers: {
        "content-type": "application/json;charset=utf-8",
        "content-disposition": `attachment; filename="content-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
        ...SECURITY_HEADERS,
      },
    });
  }

  // 导入内容（覆盖）
  if (path === "/api/import" && request.method === "POST") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const body = await request.json().catch(() => null);
    const content = body && body.content;
    if (!content || !content.locales || !content.profile) return json({ error: "invalid content" }, 400);
    for (const lang of LOCALES) {
      if (!content.locales[lang]) return json({ error: `missing locale ${lang}` }, 400);
    }
    await saveContent(env, content);
    return json({ ok: true });
  }

  // 撤销上一次保存
  if (path === "/api/restore" && request.method === "POST") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const prev = await loadPrevious(env);
    if (!prev) return json({ error: "没有可恢复的版本" }, 404);
    await saveContent(env, prev);
    return json({ ok: true });
  }

  // 重置为仓库里的 content.json 默认值
  if (path === "/api/reset" && request.method === "POST") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    await env.CONTENT.delete(CONTENT_KEY);
    for (const lang of LOCALES) await env.CONTENT.delete(htmlKey(lang));
    return json({ ok: true });
  }

  // 退出所有设备（吊销所有会话）
  if (path === "/api/logout-all" && request.method === "POST") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const epoch = Number((await env.CONTENT.get("admin:epoch")) || 0) + 1;
    await env.CONTENT.put("admin:epoch", String(epoch));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": cookieHeader("", 0),
        "cache-control": "no-store",
        ...SECURITY_HEADERS,
      },
    });
  }

  // 修改后台密码：校验当前密码后写入 KV，之后无需再动终端
  if (path === "/api/password" && request.method === "POST") {
    if (!isTrustedMutation(request)) return json({ error: "forbidden" }, 403);
    const body = await request.json().catch(() => ({}));
    const current = String(body.current || "");
    const next = String(body.next || "");
    if (next.length < 8) return json({ error: "密码至少 8 位" }, 400);
    const expected = await getPasswordHash(env);
    if (!expected || !safeEqual(await sha256Hex(current), expected)) {
      return json({ error: "当前密码不正确" }, 403);
    }
    await env.CONTENT.put(PASSWORD_KEY, await sha256Hex(next));
    return json({ ok: true });
  }

  return json({ error: "not found" }, 404);
}

// ---- 头像 ----------------------------------------------------------------
async function handleAvatar(request, env, url) {
  const stored = await loadAvatar(env);
  if (stored) {
    const realType = sniffImageType(stored.body) || stored.type;
    const etag = `W/"avatar-${stored.rev || 0}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { etag, "cache-control": "public, max-age=0, must-revalidate" } });
    }
    return new Response(stored.body, {
      headers: {
        "content-type": realType,
        "cache-control": "public, max-age=0, must-revalidate",
        etag,
        "x-content-type-options": "nosniff",
      },
    });
  }
  const fallback = await env.ASSETS.fetch(new URL("/assets/avatar.svg", url));
  return new Response(fallback.body, {
    // 默认头像只缓存 1 分钟：一旦上传了新头像，浏览器能很快切过来
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=60" },
  });
}

// ---- 主入口 --------------------------------------------------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 根路径：按浏览器语言跳转
    if (path === "/") {
      const accept = request.headers.get("accept-language") || "";
      const lang = /\bzh\b|\bzh-|, ?zh/i.test(accept)
        ? "zh"
        : /\bfr\b|\bfr-|, ?fr/i.test(accept)
          ? "fr"
          : "en";
      return Response.redirect(new URL(`/${lang}/`, url).toString(), 302);
    }

    if (path === "/index.html") {
      return Response.redirect(new URL("/", url).toString(), 301);
    }

    if (path === "/avatar") return handleAvatar(request, env, url);

    if (path.startsWith("/img/")) {
      const id = path.slice(5);
      if (!IMAGE_ID.test(id)) return new Response("Not found", { status: 404 });
      const img = await loadImage(env, id);
      if (!img) return new Response("Not found", { status: 404 });
      return new Response(img.body, {
        headers: {
          "content-type": sniffImageType(img.body) || img.type,
          "cache-control": "public, max-age=86400",
          "x-content-type-options": "nosniff",
        },
      });
    }

    if (path === "/admin") {
      const authed = await isAuthed(request, env);
      if (!authed) {
        const configured = await getPasswordHash(env);
        if (!configured) {
          return html(
            loginPage({
              error:
                "后台尚未配置密码。请在项目目录运行 npm run admin:password，或在终端执行 npx wrangler secret put ADMIN_PASSWORD_HASH。",
            }),
            503,
            { "x-robots-tag": "noindex, nofollow" }
          );
        }
        return html(loginPage(), 200, { "x-robots-tag": "noindex, nofollow" });
      }
      return html(editorPage(), 200, { "x-robots-tag": "noindex, nofollow" });
    }

    if (path.startsWith("/api/")) return handleApi(request, env, url);

    // 三语页面
    const m = path.match(/^\/(en|fr|zh)\/$/);
    if (m) {
      const content = await loadContent(env);
      const etag = `W/"${content._rev || "0"}-${m[1]}"`;
      if (request.headers.get("if-none-match") === etag) {
        return new Response(null, {
          status: 304,
          headers: { etag, "cache-control": "public, max-age=0, must-revalidate", ...SECURITY_HEADERS },
        });
      }
      const page = await getHtml(env, m[1], content);
      return html(page, 200, {
        etag,
        "cache-control": "public, max-age=0, must-revalidate",
      });
    }

    // 静态资源
    if (path.startsWith("/assets/") || path === "/robots.txt" || path === "/sitemap.xml" || path === "/favicon.ico") {
      return harden(await env.ASSETS.fetch(request));
    }

    // 404
    const content = await loadContent(env);
    return html(render404(content), 404);
  },
};
