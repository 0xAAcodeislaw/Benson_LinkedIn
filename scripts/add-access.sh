#!/usr/bin/env bash
# 给 5 个私有预览站加 Cloudflare Access（Zero Trust）保护
#
# 原理：每个域名建一个 "self-hosted" Access 应用 + 一条 Allow 策略
#       （只允许指定邮箱通过 One-time PIN 登录），登录前所有请求被拦在边缘。
#
# 前置：从 wrangler 的加密配置里取出 OAuth token（本脚本自动做）。
# 手动做法见 README「加 Access 保护」章节。
set -euo pipefail
cd "$(dirname "$0")/.."

ACCT="5cca441718af0f74661767f7fdd2f54c"
EMAIL="0xaa.codeislaw@gmail.com"

# ---- 1. 取 token：优先用专用 API Token，否则回落到 wrangler OAuth -------------
if [ -n "${CF_ACCESS_TOKEN:-}" ]; then
  TOKEN="$CF_ACCESS_TOKEN"
  echo "使用 CF_ACCESS_TOKEN（Zero Trust 写权限）"
else
  echo "警告：未设置 CF_ACCESS_TOKEN，回落到 wrangler OAuth token（可能报 auth.forbidden）"
  TOKEN=$(node --input-type=module -e '
import { readFileSync } from "node:fs";
import { createDecipheriv } from "node:crypto";
import { execSync } from "node:child_process";
const key = JSON.parse(execSync("security find-generic-password -s wrangler -a default -w").toString().trim()).key;
const enc = JSON.parse(readFileSync(process.env.HOME + "/.wrangler/config/default.enc", "utf8"));
const d = createDecipheriv(enc.alg, Buffer.from(key, "base64"), Buffer.from(enc.iv, "base64"));
d.setAuthTag(Buffer.from(enc.tag, "base64"));
const out = d.update(Buffer.from(enc.ciphertext, "base64"), "base64", "utf8") + d.final("utf8");
process.stdout.write(out.match(/oauth_token\s*=\s*"([^"]+)"/)[1]);
')
fi

api() {  # api METHOD PATH [JSON_BODY]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -s -X "$method" "https://api.cloudflare.com/client/v4/accounts/$ACCT$path" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$body"
  else
    curl -s -X "$method" "https://api.cloudflare.com/client/v4/accounts/$ACCT$path" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

# ---- 2. 每个域名建一个 Access 应用 --------------------------------------------
# allowed_idps 留空数组 → 使用 Cloudflare 内置的 One-time PIN（邮箱验证码）
# 策略：include = email 列表（只允许 EMAIL），session_duration = 24h
node -e '
const fs=require("fs");
const names=JSON.parse(fs.readFileSync("/tmp/variant-domains.json","utf8"));
fs.writeFileSync("/tmp/variant-hosts.txt",Object.values(names).join("\n"));
'

while read -r HOST; do
  [ -z "$HOST" ] && continue
  echo "=== $HOST ==="

  # 查是否已存在（避免重复建）
  EXIST=$(api GET "/access/apps" | python3 -c '
import sys,json
d=json.load(sys.stdin)
for a in (d.get("result") or []):
    if a.get("domain")==sys.argv[1]: print(a["id"])
' "$HOST")

  if [ -n "$EXIST" ]; then
    APP_ID="$EXIST"
    echo "  已有应用 $APP_ID，跳过创建"
  else
    BODY=$(EMAIL="$EMAIL" HOST="$HOST" node -e '
      const body = {
        name: "Preview: " + process.env.HOST,
        domain: process.env.HOST,
        type: "self_hosted",
        session_duration: "24h",
        auto_redirect_to_identity: false,
        allowed_idps: [],              // 空 = 内置 One-time PIN
        policies: [{
          name: "Only me",
          decision: "allow",
          include: [{ email: { email: process.env.EMAIL } }],
          require: [], exclude: []
        }]
      };
      process.stdout.write(JSON.stringify(body));
    ')
    RESP=$(api POST "/access/apps" "$BODY")
    APP_ID=$(echo "$RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("result") or {}).get("id",""))' 2>/dev/null)
    if [ -z "$APP_ID" ]; then
      echo "  ✗ 创建失败: $RESP"; continue
    fi
    echo "  ✓ 已建应用 $APP_ID"
  fi

  # 确认策略已绑定（新建时内联 policies 有时不生效，补一次 PUT）
  POL=$(EMAIL="$EMAIL" APP_ID="$APP_ID" node -e '
    process.stdout.write(JSON.stringify([{
      name: "Only me",
      decision: "allow",
      include: [{ email: { email: process.env.EMAIL } }],
      require: [], exclude: []
    }]));
  ')
  api PUT "/access/apps/$APP_ID/policies" "{\"policies\":$POL}" >/dev/null 2>&1 || true

done < /tmp/variant-hosts.txt

echo ""
echo "完成。现在访问任一预览域名会先要求邮箱验证码（@$EMAIL）。"
