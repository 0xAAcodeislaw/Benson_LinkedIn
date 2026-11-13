// Worker 侧渲染与 KV 存储封装。
// 复用 scripts/templates.mjs（纯字符串模板），保证后台渲染与本地构建产物完全一致。
import defaults from "../content.json";
import { buildPage, buildNotFound } from "../scripts/templates.mjs";

export const LOCALES = (defaults.site.languageOrder || Object.keys(defaults.locales)).filter(
  (l) => defaults.locales[l]
);

export const LANG_LINKS = Object.fromEntries(
  LOCALES.map((l) => [l, defaults.locales[l].label || l.toUpperCase()])
);

export const CONTENT_KEY = "content";
export const htmlKey = (lang) => `html:${lang}`;
export const AVATAR_KEY = "avatar";

export function defaultContent() {
  return structuredClone(defaults);
}

// 读取 KV 中的内容；没有则回落到仓库里的 content.json
export async function loadContent(env) {
  try {
    const raw = await env.CONTENT.get(CONTENT_KEY, "json");
    if (raw && raw.locales && raw.profile) return raw;
  } catch {
    /* KV 未绑定或读取失败时静默回落到默认值 */
  }
  return defaultContent();
}

export function renderLocale(lang, content) {
  return buildPage({
    lang,
    loc: content.locales[lang],
    site: content.site,
    profile: content.profile,
    locales: LOCALES,
    langLinks: LANG_LINKS,
  });
}

export function render404(content) {
  return buildNotFound({ profile: content.profile, locales: LOCALES, content });
}

export const PREV_KEY = "content:prev";

// 保存内容：先留一份上一版（供撤销），写 KV，并重新生成三种语言的 HTML
export async function saveContent(env, content) {
  try {
    const current = await env.CONTENT.get(CONTENT_KEY, "json");
    if (current) await env.CONTENT.put(PREV_KEY, JSON.stringify(current));
  } catch {
    /* 备份失败不影响保存 */
  }
  // 版本号用于 ETag，保存即变化
  content._rev = String(Date.now());
  await env.CONTENT.put(CONTENT_KEY, JSON.stringify(content));
  await Promise.all(
    LOCALES.map((lang) => env.CONTENT.put(htmlKey(lang), renderLocale(lang, content)))
  );
}

export async function loadPrevious(env) {
  try {
    return await env.CONTENT.get(PREV_KEY, "json");
  } catch {
    return null;
  }
}

// 取某个语言的 HTML：优先 KV 缓存，缺失时现渲染并写回
export async function getHtml(env, lang, content) {
  try {
    const cached = await env.CONTENT.get(htmlKey(lang));
    if (cached) return cached;
  } catch {
    /* 忽略，走现渲染 */
  }
  const html = renderLocale(lang, content);
  try {
    await env.CONTENT.put(htmlKey(lang), html);
  } catch {
    /* 写缓存失败不影响响应 */
  }
  return html;
}

export async function loadAvatar(env) {
  try {
    const entry = await env.CONTENT.getWithMetadata(AVATAR_KEY, "arrayBuffer");
    if (entry.value) {
      return { body: entry.value, type: (entry.metadata && entry.metadata.type) || "image/webp" };
    }
  } catch {
    /* 忽略 */
  }
  return null;
}

export async function saveAvatar(env, bytes, type) {
  await env.CONTENT.put(AVATAR_KEY, bytes, { metadata: { type } });
}

export async function deleteAvatar(env) {
  await env.CONTENT.delete(AVATAR_KEY);
}

// ---- 项目图片 ----
export const imageKey = (id) => `img:${id}`;

export async function saveImage(env, id, bytes, type) {
  await env.CONTENT.put(imageKey(id), bytes, { metadata: { type } });
}

export async function loadImage(env, id) {
  try {
    const entry = await env.CONTENT.getWithMetadata(imageKey(id), "arrayBuffer");
    if (entry.value) {
      return { body: entry.value, type: (entry.metadata && entry.metadata.type) || "image/webp" };
    }
  } catch {
    /* 忽略 */
  }
  return null;
}

export async function deleteImage(env, id) {
  await env.CONTENT.delete(imageKey(id));
}
