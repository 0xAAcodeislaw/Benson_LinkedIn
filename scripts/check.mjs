// 构建产物与内容一致性校验：npm run check
// 覆盖：三语结构一致、必填字段、JSON-LD 可解析、无重复 id、内链可达、图片 alt、简历 PDF。
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const content = JSON.parse(readFileSync(join(root, "content.json"), "utf8"));
const publicDir = join(root, "public");
const locales = Object.keys(content.locales);

let errors = 0;
let warnings = 0;

const fail = (msg) => {
  errors++;
  console.log(`  ✗ ${msg}`);
};
const warn = (msg) => {
  warnings++;
  console.log(`  ! ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

// ---- 1. 三语 key 结构一致 -------------------------------------------------
function keyPaths(value, prefix = "") {
  if (Array.isArray(value)) {
    const set = new Set();
    value.forEach((item) => keyPaths(item, `${prefix}[]`).forEach((k) => set.add(k)));
    return [...set];
  }
  if (value && typeof value === "object") {
    return Object.keys(value).flatMap((k) => keyPaths(value[k], prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

console.log("\n[1/6] 三语结构一致性");
const base = new Set(keyPaths(content.locales[locales[0]]));
let structureOk = true;
for (const lang of locales.slice(1)) {
  const keys = new Set(keyPaths(content.locales[lang]));
  const missing = [...base].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !base.has(k));
  if (missing.length) {
    structureOk = false;
    fail(`${lang} 缺少字段：${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
  }
  if (extra.length) {
    structureOk = false;
    fail(`${lang} 多出字段：${extra.slice(0, 8).join(", ")}${extra.length > 8 ? " …" : ""}`);
  }
}
if (structureOk) ok(`${locales.length} 个语言字段结构一致（${base.size} 个叶子字段）`);

// ---- 2. 必填字段 ----------------------------------------------------------
console.log("\n[2/6] 必填字段");
const required = ["profile.name", "profile.email", "profile.github", "profile.linkedin", "site.url"];
for (const path of required) {
  const value = path.split(".").reduce((o, k) => (o == null ? o : o[k]), content);
  if (!value || String(value).includes("example.com")) {
    warn(`${path} = ${JSON.stringify(value)}（占位或缺失，上线前请替换）`);
  }
}
for (const lang of locales) {
  const loc = content.locales[lang];
  for (const path of ["meta.title", "meta.description", "hero.headline", "hero.btnResume", "a11y.skip"]) {
    const value = path.split(".").reduce((o, k) => (o == null ? o : o[k]), loc);
    if (!value) fail(`locales.${lang}.${path} 缺失`);
  }
}
if (!errors) ok("必填字段齐全");

// ---- 3. 产物存在 ----------------------------------------------------------
console.log("\n[3/6] 构建产物");
if (!existsSync(publicDir)) {
  fail("public/ 不存在，请先运行 npm run build");
  process.exit(1);
}
for (const lang of locales) {
  const file = join(publicDir, lang, "index.html");
  if (existsSync(file)) ok(`public/${lang}/index.html`);
  else fail(`缺少 public/${lang}/index.html`);
}
for (const file of ["404.html", "robots.txt", "sitemap.xml"]) {
  if (existsSync(join(publicDir, file))) ok(`public/${file}`);
  else fail(`缺少 public/${file}`);
}

const assets = existsSync(join(publicDir, "assets")) ? readdirSync(join(publicDir, "assets")) : [];
for (const lang of locales) {
  if (assets.includes(`resume-${lang}.pdf`)) ok(`assets/resume-${lang}.pdf`);
  else warn(`缺少 assets/resume-${lang}.pdf（运行 npm run resume 生成）`);
}

// ---- 4. 页面结构 ----------------------------------------------------------
console.log("\n[4/6] 页面结构");
let structureErrors = errors;
for (const lang of locales) {
  const file = join(publicDir, lang, "index.html");
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");

  if (!new RegExp(`<html lang="${lang}"`).test(html)) fail(`${lang}: <html lang> 不是 "${lang}"`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) fail(`${lang}: 重复 id → ${[...new Set(dupes)].join(", ")}`);

  const h1s = (html.match(/<h1[ >]/g) || []).length;
  if (h1s !== 1) fail(`${lang}: 期望 1 个 <h1>，实际 ${h1s}`);

  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((tag) => !/\salt="[^"]*"/.test(tag));
  if (noAlt.length) fail(`${lang}: ${noAlt.length} 个 <img> 缺少 alt`);

  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld) {
    fail(`${lang}: 缺少 JSON-LD`);
  } else {
    try {
      const data = JSON.parse(ld[1]);
      if (data["@type"] !== "Person") fail(`${lang}: JSON-LD @type 不是 Person`);
    } catch (e) {
      fail(`${lang}: JSON-LD 解析失败 → ${e.message}`);
    }
  }
}
if (errors === structureErrors) ok("lang 属性、id 唯一性、单 h1、图片 alt、JSON-LD 均正常");

// ---- 5. 内链可达 ----------------------------------------------------------
console.log("\n[5/6] 内链可达性");
// 由 Worker 动态提供、不对应静态文件的路径
const DYNAMIC_ROUTES = new Set(["/", "/avatar", "/admin"]);
const broken = new Set();
for (const lang of locales) {
  const file = join(publicDir, lang, "index.html");
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
    const target = m[1];
    if (target.startsWith("//") || DYNAMIC_ROUTES.has(target)) continue;
    let resolved = join(publicDir, target);
    if (target.endsWith("/")) resolved = join(resolved, "index.html");
    if (!existsSync(resolved)) broken.add(`${target} (from ${lang})`);
  }
}
if (broken.size) [...broken].forEach((b) => fail(`内链目标不存在：${b}`));
else ok("所有站内链接均可解析");

// ---- 6. 内容体量 ----------------------------------------------------------
console.log("\n[6/6] 页面体积");
for (const lang of locales) {
  const file = join(publicDir, lang, "index.html");
  if (!existsSync(file)) continue;
  const size = readFileSync(file).length;
  const kb = size / 1024;
  if (kb > 80) warn(`${lang}: ${kb.toFixed(1)} KB（偏大，检查是否误嵌入大段内容）`);
  else ok(`${lang}: ${kb.toFixed(1)} KB`);
}

// ---- 汇总 ----------------------------------------------------------------
console.log("");
if (errors) {
  console.log(`✗ 校验失败：${errors} 个错误，${warnings} 个警告\n`);
  process.exit(1);
}
console.log(`✓ 校验通过${warnings ? `（${warnings} 个警告）` : ""}\n`);
