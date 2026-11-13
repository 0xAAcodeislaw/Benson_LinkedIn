// 生成三语 PDF 简历：把 public/ 起一个临时静态服务，用无头 Chrome 按打印样式导出。
// 输出到 src/assets/resume-{lang}.pdf，随 npm run build 一起拷进 public/assets/。
// 找不到 Chrome 时只警告、不中断（保留已有 PDF）。
import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import { constants, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, "public");
const outDir = join(root, "src", "assets");

// 语言顺序与站点保持一致
const content = JSON.parse(await readFile(join(root, "content.json"), "utf8"));
const LOCALES = (content.site.languageOrder || Object.keys(content.locales)).filter(
  (l) => content.locales[l]
);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".json": "application/json",
};

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* 继续尝试下一个 */
    }
  }
  return null;
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let path = decodeURIComponent(url.pathname);
      // 页面里的头像指向 /avatar（线上由 Worker 提供），本地生成 PDF 时回落到默认 SVG
      if (path === "/avatar") path = "/assets/avatar.svg";
      if (path.endsWith("/")) path += "index.html";
      const file = join(publicDir, path);
      if (!file.startsWith(publicDir)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const chrome = await findChrome();
  if (!chrome) {
    console.warn("  ⚠ 未找到 Chrome/Chromium，跳过 PDF 生成（已有 PDF 会保留）");
    console.warn("    可设置 CHROME_PATH 指向可执行文件后重试");
    return;
  }

  const server = await startServer();
  const port = server.address().port;

  try {
    for (const lang of LOCALES) {
      const out = join(outDir, `resume-${lang}.pdf`);
      const profileDir = join(tmpdir(), `zcode-resume-${process.pid}-${lang}`);
      const args = [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--no-pdf-header-footer",
        "--virtual-time-budget=3000",
        `--user-data-dir=${profileDir}`,
        `--print-to-pdf=${out}`,
        `http://127.0.0.1:${port}/${lang}/`,
      ];

      await execFileAsync(chrome, args, { timeout: 90_000 });

      const { size } = statSync(out);
      console.log(`  resume-${lang}.pdf  ${(size / 1024).toFixed(0)} KB`);
    }
    console.log(`\n✓ PDF 简历已生成 → src/assets/`);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error("PDF 生成失败：", err.message);
  process.exitCode = 1;
});
