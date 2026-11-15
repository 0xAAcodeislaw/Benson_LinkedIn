// 预览站访问口令网关（不依赖 Cloudflare Zero Trust，零成本）
// 逻辑：env.PREVIEW_PASSWORD 存在时，除 /preview-unlock 与静态资源外，
//       所有页面请求都要先带一个签名 Cookie；否则显示口令输入页。
// 主站不设这个环境变量 → 网关完全不启用，行为与原来一致。

// 独立实现，避免改动主站 worker.js 的既有工具函数（零回归风险）
const enc = new TextEncoder();
function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PREVIEW_COOKIE = "bd_preview";
const PREVIEW_TTL = 30 * 24 * 60 * 60; // 30 天
const PREVIEW_FAIL_KEY = "preview:fail";

function previewGateEnabled(env) {
  return !!(env.PREVIEW_PASSWORD && String(env.PREVIEW_PASSWORD).trim());
}

async function previewKey(env) {
  return `${env.SESSION_SECRET || "insecure-dev-secret"}|${env.PREVIEW_PASSWORD}`;
}

async function makePreviewSession(env) {
  const exp = Math.floor(Date.now() / 1000) + PREVIEW_TTL;
  const sig = await hmac(await previewKey(env), String(exp));
  return `${exp}.${sig}`;
}

export async function isPreviewAuthed(request, env) {
  if (!previewGateEnabled(env)) return true; // 未启用 = 直接放行
  const value = (request.headers.get("cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(PREVIEW_COOKIE + "="));
  if (!value) return false;
  const raw = value.slice(PREVIEW_COOKIE.length + 1);
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(await previewKey(env), exp);
  return safeEqual(sig, expected);
}

function unlockPage({ error = "", next = "/" } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Preview access</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#f4f2ee;color:#191919;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC",sans-serif;padding:20px}
.box{width:100%;max-width:360px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:8px;padding:32px 28px}
h1{font-size:20px;margin:0 0 6px}
p.sub{margin:0 0 20px;color:rgba(0,0,0,.6);font-size:13px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
input[type=password]{width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,.15);border-radius:8px;background:#fff;font-size:16px}
input[type=password]:focus{outline:2px solid #0a66c2;outline-offset:1px;border-color:transparent}
button{width:100%;margin-top:16px;padding:10px;border:none;border-radius:999px;background:#0a66c2;color:#fff;font-weight:600;font-size:14px;cursor:pointer}
button:hover{background:#004182}
.err{margin-top:14px;padding:9px 12px;border-radius:8px;background:#fdecea;color:#b3261e;font-size:13px}
</style>
</head>
<body>
<form class="box" method="post" action="/preview-unlock">
  <h1>Preview access</h1>
  <p class="sub">This preview is private. Enter the access password.</p>
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
  <input type="hidden" name="next" value="${next.replace(/"/g, "&quot;")}">
  <button type="submit">Unlock</button>
  ${error ? `<div class="err">${error}</div>` : ""}
</form>
</body>
</html>`;
}

// 返回 null 表示「已通过，继续正常处理」；返回 Response 表示「拦下」
export async function previewGate(request, env) {
  if (!previewGateEnabled(env)) return null;
  const url = new URL(request.url);
  const path = url.pathname;

  // 解锁端点本身放行
  if (path === "/preview-unlock" && request.method === "POST") {
    return handleUnlock(request, env, url);
  }

  // 静态资源放行（CSS/JS/图片/字体），否则解锁页自身都加载不了
  if (
    path.startsWith("/assets/") ||
    path === "/avatar" ||
    path.startsWith("/img/") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  ) {
    return null;
  }

  if (await isPreviewAuthed(request, env)) return null;

  // 未通过：API/后台也一并保护
  const next = path + (url.search || "");
  return new Response(unlockPage({ next }), {
    status: 401,
    headers: {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

async function handleUnlock(request, env, url) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  let fails = 0;
  try {
    fails = Number((await env.CONTENT.get(PREVIEW_FAIL_KEY + ":" + ip)) || 0);
  } catch {
    /* 忽略 */
  }
  if (fails >= 5) {
    return new Response(unlockPage({ error: "Too many attempts. Try again in 15 minutes.", next: "/" }), {
      status: 429,
      headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" },
    });
  }

  const form = await request.formData();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/");
  const ok = safeEqual(password, String(env.PREVIEW_PASSWORD));

  if (!ok) {
    try {
      await env.CONTENT.put(PREVIEW_FAIL_KEY + ":" + ip, String(fails + 1), { expirationTtl: 900 });
    } catch {
      /* 忽略 */
    }
    return new Response(unlockPage({ error: "Incorrect password.", next }), {
      status: 401,
      headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" },
    });
  }

  try {
    await env.CONTENT.delete(PREVIEW_FAIL_KEY + ":" + ip);
  } catch {
    /* 忽略 */
  }

  const session = await makePreviewSession(env);
  return new Response(null, {
    status: 302,
    headers: {
      location: next.startsWith("/") ? next : "/",
      "set-cookie": `${PREVIEW_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${PREVIEW_TTL}`,
      "cache-control": "no-store",
    },
  });
}
