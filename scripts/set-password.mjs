// 设置后台密码：npm run admin:password
// 读取密码（隐藏输入）→ SHA-256 → 写入 Cloudflare secret；同时生成 SESSION_SECRET。
// 加 --dev 参数会把同样的值写进 .dev.vars，供 wrangler dev 本地测试。
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function promptHidden(label) {
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      let buf = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (d) => {
        buf += d;
        if (buf.includes("\n")) {
          process.stdin.pause();
          resolve(buf.split("\n")[0]);
        }
      });
    });
  }
  return new Promise((resolve) => {
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u0003") {
          process.stdout.write("\n已取消\n");
          process.exit(1);
        }
        if (c === "\u007f" || c === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += c;
      }
    };
    process.stdin.on("data", onData);
  });
}

function putSecret(name, value) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["wrangler", "secret", "put", name], {
      cwd: root,
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.stdin.write(value + "\n");
    child.stdin.end();
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`退出码 ${code}`))));
  });
}

async function main() {
  console.log("\n设置后台密码（输入时不显示）\n");
  const password = await promptHidden("新密码: ");
  if (password.length < 8) {
    console.error("\n密码至少 8 位。\n");
    process.exit(1);
  }
  const again = await promptHidden("再输一次: ");
  if (password !== again) {
    console.error("\n两次输入不一致。\n");
    process.exit(1);
  }

  const hash = createHash("sha256").update(password, "utf8").digest("hex");
  const sessionSecret = randomBytes(32).toString("hex");

  if (process.argv.includes("--dev")) {
    const devVars = `ADMIN_PASSWORD_HASH=${hash}\nSESSION_SECRET=${sessionSecret}\n`;
    await writeFile(join(root, ".dev.vars"), devVars, "utf8");
    console.log("\n✓ 已写入 .dev.vars（仅本地 wrangler dev 使用）");
  }

  console.log("\n正在写入 Cloudflare secret…");
  await putSecret("ADMIN_PASSWORD_HASH", hash);
  await putSecret("SESSION_SECRET", sessionSecret);
  console.log("\n✓ 完成。访问 https://<你的域名>/admin 登录。\n");
}

main().catch((err) => {
  console.error("\n设置失败：", err.message, "\n");
  process.exit(1);
});
