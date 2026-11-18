#!/usr/bin/env bash
# 批量部署 5 个风格版本到各自独立的 Worker（不合并进 main）。
# 用法：bash scripts/deploy-variants.sh [all|geek|cyber|minecraft|blockchain|corporate]
set -euo pipefail
cd "$(dirname "$0")/.."

get_worker() { case "$1" in
  geek) echo "benson-geek" ;; cyber) echo "benson-cyber" ;;
  minecraft) echo "benson-minecraft" ;; blockchain) echo "benson-blockchain" ;;
  corporate) echo "benson-corporate" ;; esac; }
get_kv() { case "$1" in
  geek) echo "0db347d0e90a4216b1a22015563693ee" ;;
  cyber) echo "5482b7e1d09542199a4f56432b2cc8ab" ;;
  minecraft) echo "311ffcaaf4f0472fbfe4562dd79a5d17" ;;
  blockchain) echo "315a47b12be24827afd370095b2f0f88" ;;
  corporate) echo "eec2e22637994e71955e57d3ad2abb60" ;; esac; }
get_branch() { case "$1" in
  geek) echo "style/geek" ;; cyber) echo "style/cyber" ;;
  minecraft) echo "style/minecraft" ;; blockchain) echo "style/blockchain" ;;
  corporate) echo "style/corporate" ;; esac; }
# 私有预览域（与 PREVIEW-PRIVATE.md 保持同步；workers.dev 已全部关闭）
get_url() { case "$1" in
  geek) echo "https://pv-geek-30bd0d2250c1.codeislaw.qzz.io" ;;
  cyber) echo "https://pv-cyber-de155beeeddc.codeislaw.qzz.io" ;;
  minecraft) echo "https://pv-minecraft-9dcedbbff802.codeislaw.qzz.io" ;;
  blockchain) echo "https://pv-blockchain-0e57d221e77d.codeislaw.qzz.io" ;;
  corporate) echo "https://pv-corporate-b1158a55cd0d.codeislaw.qzz.io" ;; esac; }

TARGETS="${1:-all}"
if [ "$TARGETS" = "all" ]; then TARGETS="geek cyber minecraft blockchain corporate"; fi

for t in $TARGETS; do
  W="$(get_worker "$t")"
  K="$(get_kv "$t")"
  B="$(get_branch "$t")"
  URL="$(get_url "$t")"
  echo ""
  echo "════════════════════════════════════════════════"
  echo "  $t → $W  (KV $K)"
  echo "════════════════════════════════════════════════"

  git checkout -q "$B"

  # 1) 主题 CSS
  cp "themes/$t.css" src/assets/theme.css

  # 2) 独立 wrangler.toml：独立 Worker 名 + 独立 KV
  #    workers_dev=false：workers.dev 路由必须关（防扫描），只走私有预览域。
  #    此前靠部署后手工关闭、未进版本控制，重新 deploy 会复发 —— 已踩过坑。
  cat > wrangler.toml <<EOF
name = "$W"
main = "src/worker.js"
compatibility_date = "2026-11-12"
workers_dev = false

[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = true

[[kv_namespaces]]
binding = "CONTENT"
id = "$K"

[[durable_objects.bindings]]
name = "VISITS"
class_name = "VisitCounter"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["VisitCounter"]
EOF

  # 3) 站点 URL 指向私有预览域（canonical / OG / sitemap 自洽，不泄露 workers.dev）
  node -e '
    const fs=require("fs");
    const c=JSON.parse(fs.readFileSync("content.json","utf8"));
    c.site.url=process.argv[1];
    // Minecraft 版启用专属增强脚本（像素化头像 + 物品栏）
    c.site.themeFlag=process.argv[2]==="minecraft" ? "minecraft" : "";
    // 各风格独立统计：清空官方 token，避免 5 个站的数据混进同一个 Web Analytics 站点
    c.site.analyticsToken="";
    delete c._rev;
    fs.writeFileSync("content.json",JSON.stringify(c,null,2)+"\n");
  ' "$URL" "$t"

  # 4) 构建 + 校验
  npm run build >/dev/null
  npm run check >/dev/null

  # 5) 提交到各自分支
  git add -A
  git commit -q -m "style: $t 独立风格版本 + 独立 Worker/KV 配置" || echo "  (无改动，跳过提交)"

  # 6) 部署到独立 Worker
  npx wrangler deploy 2>&1 | sed -e 's/\x1b\[[0-9;]*m//g' | grep -E "Deployed|https://|Current Version|Error|ERROR" | sed 's/^/  /'

  # 7) 用默认内容初始化 KV（后台可改，主站数据不串）
  npx wrangler kv key put content --path=content.json --namespace-id="$K" --remote >/dev/null 2>&1 || true

  echo "  ✓ $t 完成 → $URL"
done

git checkout -q main
echo ""
echo "全部完成，已回到 main 分支。"
