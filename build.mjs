// 构建编排：content.json → public/{en,zh,fr}/index.html + 404 + robots + sitemap
// 页面结构见 scripts/templates.mjs，图标见 scripts/icons.mjs。
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPage, buildNotFound } from "./scripts/templates.mjs";

const root = dirname(fileURLToPath(import.meta.url));

// 风格变体与站点 URL 由各分支的 package.json scripts 提供
const VARIANT = process.env.VARIANT || "";
const VARIANT_THEME_COLOR = {
  geek: "#0a0e0a", cyber: "#070316", minecraft: "#5ea832",
  blockchain: "#0b1220", corporate: "#1a3a5c",
}[VARIANT] || "#0a66c2";
const SITE_URL = process.env.SITE_URL || "";

const content = JSON.parse(readFileSync(join(root, "content.json"), "utf8"));

// 语言顺序由 content.json 的 site.languageOrder 决定（未配置时用 locales 的书写顺序）
const LOCALES = (content.site.languageOrder || Object.keys(content.locales)).filter(
  (l) => content.locales[l]
);
// 切换按钮上的文案取自各语言块的 label 字段
const LANG_LINKS = Object.fromEntries(
  LOCALES.map((l) => [l, content.locales[l].label || l.toUpperCase()])
);

const outDir = join(root, "public");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(root, "src/assets"), join(outDir, "assets"), { recursive: true });

// 风格主题（若存在）输出为带风格名的文件，避免多 Worker 部署时同路径缓存串味。
// 优先取变体专属文件（部署脚本拷贝的目标名），避免分支上残留的旧 theme.css 覆盖新主题。
const variantSrc = join(root, "src/assets", `theme-${VARIANT}.css`);
const themeSrc = join(root, "src/assets/theme.css");
const themeFile = existsSync(variantSrc) ? variantSrc : existsSync(themeSrc) ? themeSrc : null;
if (themeFile) {
  cpSync(themeFile, join(outDir, "assets", `theme-${VARIANT}.css`));
  rmSync(join(outDir, "assets", "theme.css"), { force: true });
}

// ---- 页面 ----
if (SITE_URL) content.site.url = SITE_URL;
delete content._rev;

for (const lang of LOCALES) {
  const dir = join(outDir, lang);
  mkdirSync(dir, { recursive: true });
  const html = buildPage({
    lang,
    loc: content.locales[lang],
    site: content.site,
    profile: content.profile,
    locales: LOCALES,
    langLinks: LANG_LINKS,
  });
  // R4: 注入 theme-color meta
  const themed = html.replace("</head>", `  <meta name="theme-color" content="${VARIANT_THEME_COLOR}">\n</head>`);
  writeFileSync(join(dir, "index.html"), themed);
  console.log(`  /${lang}/  ${(html.length / 1024).toFixed(1)} KB`);
}

writeFileSync(
  join(outDir, "404.html"),
  buildNotFound({ profile: content.profile, locales: LOCALES, content })
);
console.log("  404.html");

// Pages 静态部署时，/avatar 没有 Worker 提供，回落到默认 SVG
writeFileSync(join(outDir, "_redirects"), "/avatar /assets/avatar.svg 200\n");

// ---- robots.txt / sitemap.xml ----
writeFileSync(
  join(outDir, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${content.site.url}/sitemap.xml\n`
);

const lastmod = new Date().toISOString().slice(0, 10);
const sitemapUrls = [
  ...LOCALES.map(
    (l) => `  <url>
    <loc>${content.site.url}/${l}/</loc>
    <lastmod>${lastmod}</lastmod>
${LOCALES.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${content.site.url}/${a}/"/>`).join("\n")}
  </url>`
  ),
  `  <url>
    <loc>${content.site.url}/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
].join("\n");

writeFileSync(
  join(outDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls}
</urlset>
`
);

// ---- 简历 PDF 状态提示 ----
const missingResumes = LOCALES.filter((l) => !existsSync(join(outDir, "assets", `resume-${l}.pdf`)));
if (missingResumes.length) {
  console.log(`\n  提示：缺少简历 PDF（${missingResumes.map((l) => `resume-${l}.pdf`).join(", ")}）`);
  console.log("  运行 npm run resume 生成后再部署。\n");
}

console.log(`\n✓ 构建完成 → ${outDir}`);
