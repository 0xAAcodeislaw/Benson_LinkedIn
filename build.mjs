// 构建编排：content.json → public/{en,zh,fr}/index.html + 404 + robots + sitemap
// 页面结构见 scripts/templates.mjs，图标见 scripts/icons.mjs。
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPage, buildNotFound } from "./scripts/templates.mjs";

const root = dirname(fileURLToPath(import.meta.url));
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

// ---- 页面 ----
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
  writeFileSync(join(dir, "index.html"), html);
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
