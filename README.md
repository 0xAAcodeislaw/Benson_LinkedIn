# Benson Ding — 个人求职网站

LinkedIn 风格的三语（中 / 英 / 法）个人求职网站，部署在 Cloudflare Workers。

**线上地址：** https://benson.codeislaw.qzz.io

## 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/0xAAcodeislaw/Benson_LinkedIn)

提供两种方式，功能不同，按需选择。

> 按钮会克隆本仓库并直接部署。**部署前请先创建自己的 KV 命名空间**（`npx wrangler kv namespace create CONTENT`），把返回的 id 替换掉 `wrangler.toml` 里的 `id`，否则会因命名空间不存在而失败。完整步骤见下方。

### 方式一：Cloudflare Workers（推荐 · 功能完整）

支持三语渲染、`/admin` 后台、KV 存储、图片上传、主题设置。

点上面的按钮，或在本地执行：

```bash
npm install
npx wrangler login
npx wrangler kv namespace create CONTENT   # 把返回的 id 填进 wrangler.toml
npm run build
npx wrangler deploy
npm run admin:password                     # 设置后台密码
```

部署完成后访问 `https://<worker-name>.<你的子域>.workers.dev`。

### 方式二：Cloudflare Pages（静态版 · 无后台）

只提供构建好的静态页面，适合只需要展示、不需要在线改内容的场景。

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 选择本仓库，构建命令填 `npm run build`，输出目录填 `public`
3. 保存并部署

> **限制**：Pages 上 `/admin` 后台不可用（访问返回 404），内容修改需编辑 `content.json` 后重新部署。头像通过 `_redirects` 回落到默认 SVG。

---

## 作者

**Damizaer**

## 快速开始

```bash
npm install        # 首次
npm run dev        # 本地预览 → http://127.0.0.1:8787
npm run build      # 只构建（不部署）
npm run check      # 校验内容与产物
npm run resume     # 重新生成三语 PDF 简历
npm run deploy     # 构建 + 生成 PDF + 部署
```

## 修改内容（唯一入口）

全站文案都在 **`content.json`**，分 `en` / `zh` / `fr` 三个语言块，结构完全一致（`npm run check` 会校验一致性）。

| 字段 | 含义 |
|---|---|
| `profile` | 姓名、缩写头像、邮箱、GitHub、LinkedIn |
| `hero.availability` | 求职类型 / 可入职时间 / 工作授权（显示在姓名下方一行） |
| `hero.btnResume` | 「下载简历」按钮文案 |
| `quickFacts` | 侧栏「快速信息」的标签-值列表 |
| `about` | 关于我（段落数组） |
| `experience` | 工作经历（角色、公司、时间、地点、要点、`tech` 技术栈） |
| `education` | 学位、学校、时间、`gpa`、`honours`、`details` |
| `certifications` / `awards` | 证书与奖项（留空数组则整个区块隐藏） |
| `projects` | `featured: true` 走大卡，其余进「其他项目」；`metric` 显示为成果标签 |
| `skills` | 技能分组 |
| `languagesList` | 语言能力，`cefr` 显示为等级徽章，`pct` 控制进度条 |
| `a11y` | 跳转链接、语言切换、主题按钮的无障碍文案 |

改完运行 `npm run deploy` 即可更新线上。**上线前请替换所有占位信息**（`npm run check` 会提醒 `example.com` 邮箱）。

新增语言：在 `locales` 下加语言块，并在 `build.mjs` 的 `LANG_LINKS`、`scripts/build-resume.mjs` 的 `LOCALES`、`src/worker.js` 的语言协商逻辑中同步。

## 后台（在浏览器里改内容）

访问 **`/admin`**，输密码后即可用表单修改：

- **头像**：上传图片，自动裁剪为 512×512
- **共享**：姓名、缩写、邮箱、GitHub、LinkedIn、站点地址、**外观（主题色 / 字号 / 圆角）**
- **每种语言**：求职标语、可入职时间、工作授权、关于我、快速信息、工作经历、教育背景、志愿服务、项目（含截图上传）、出版物、技能、证书奖项、语言能力、区块标题、按钮文案、联系卡片文案、页脚与 404、无障碍文案、语言标签

点「保存」后线上立即生效，无需本地环境。

### 图片上传

精选项目的「项目截图」支持直接上传：选图后自动裁剪为 800×450 WebP，存入 KV（`img:<id>`），通过 `/img/<id>` 提供，替换原来的渐变色块。

### 打印导出 PDF

后台顶栏的「打印简历」会打开 `/en/?print=1`（可把 `en` 换成 `zh` / `fr`），自动唤起浏览器打印对话框，选「存储为 PDF」即可得到与当前内容完全一致的最新简历 —— 解决「后台改完内容、下载按钮还是旧 PDF」的问题。

### 外观

共享标签页的「外观」可改主色（浅色 / 深色两套）、正文字号（12–18）、卡片圆角（0–20）。保存后立即生效，留空则用默认值。

### 备份与撤销

共享标签页底部：

| 按钮 | 作用 |
|---|---|
| 导出 JSON | 下载当前全部内容，建议定期备份 |
| 导入 JSON | 用备份文件覆盖当前内容（会二次确认） |
| 撤销上次保存 | 恢复到上一次保存之前的状态 |

### 安全

| 项 | 说明 |
|---|---|
| 安全响应头 | CSP、HSTS、X-Frame-Options、Referrer-Policy、Permissions-Policy 全站生效 |
| 会话绑定 | Cookie 签名绑定密码哈希 + 吊销纪元，改密码或点「退出所有设备」会让所有旧会话立即失效 |
| 登录限流 | 同 IP 15 分钟 5 次失败即锁定 |
| 图片校验 | 按文件头魔数识别真实类型，防止 iOS 上 WebP 回退成 PNG 却被误标 |

### 访问统计（Cloudflare Web Analytics）

无 Cookie、无需隐私弹窗，免费。

1. Cloudflare Dashboard → **Analytics & Logs → Web Analytics** → **Add a site**
2. 填入自定义域名 `benson.codeislaw.qzz.io`（Web Analytics 的 hostname 必须与实际访问域名一致，否则不计数据）
3. 复制生成的 **token**（32 位十六进制）
4. 后台 **共享 → 站点 → Cloudflare Analytics Token** 粘贴后保存

token 为空时页面完全不加载统计脚本（零开销）。代码位在 `scripts/templates.mjs` 的 `analyticsScript()`，CSP 已放行 `static.cloudflareinsights.com`。

> 另外，Dashboard 的 **Workers & Pages → benson-ding → Metrics** 本身就有请求量、错误率、CPU 时间、边缘节点分布，无需任何配置，只是看不到「哪个页面被访问」。

### 持续集成

`.github/workflows/ci.yml` 在 push 和 PR 时自动执行 `npm ci` → `npm run build` → `npm run check`。如需自动部署，取消文件末尾的注释并配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。

### 首次配置（只需一次）

```bash
npm run admin:password
```

按提示输入两遍密码（输入时不显示），脚本会：

1. 计算 SHA-256 哈希并写入 Cloudflare secret `ADMIN_PASSWORD_HASH`
2. 生成并写入 `SESSION_SECRET`
3. 加 `--dev` 参数时，同时写 `.dev.vars` 供本地 `npm run dev` 测试

密码不会出现在代码或仓库里。

### 修改密码（之后都在网页里改）

登录后进入 **共享** 标签页，最下方有「修改密码」区块：输入当前密码 + 新密码即可。

- 新密码哈希存在 KV（`admin:hash`），优先级高于部署时的 secret
- 修改后旧密码立即失效，无需终端、无需重新部署
- 忘记密码时才需要回到终端重跑 `npm run admin:password`

### 后台的技术细节

| 项目 | 说明 |
|---|---|
| 存储 | Cloudflare KV（`CONTENT` 命名空间），键：`content`、`html:en/fr/zh`、`avatar` |
| 渲染 | 保存时用 `scripts/templates.mjs` 重新生成三语 HTML 并写入 KV，请求直接读缓存 |
| 兜底 | KV 为空时使用仓库里的 `content.json`，行为与纯静态完全一致 |
| 认证 | 单密码 + HMAC 签名 Cookie（HttpOnly / Secure / SameSite=Strict，7 天） |
| 限流 | 同 IP 15 分钟内 5 次失败即锁定 |
| 防 CSRF | 写操作校验同源 + `x-admin-request` 请求头 |
| 头像 | 仅接受 WebP/PNG/JPEG，≤ 2 MB |

### 已知限制

- **简历 PDF 不会自动更新**：PDF 由本地无头 Chrome 生成，Worker 里没有浏览器。后台改完内容后，下载按钮指向的仍是旧 PDF。需要最新版时，在页面上用浏览器「打印 → 存为 PDF」，或在本地跑 `npm run resume` 后重新部署。
- **单用户**：没有多账号，也没有找回密码流程。
- **KV 最终一致**：保存后其他地区边缘节点可能有几十秒延迟。

## 功能一览

| 能力 | 说明 |
|---|---|
| 三语独立 URL | `/en/` `/zh/` `/fr/`，`/` 按 `Accept-Language` 302 跳转 |
| 暗色模式 | 跟随系统，右上角可手动切换，偏好存 `localStorage`，无闪白 |
| 区块导航 | 桌面端顶部二级导航，滚动自动高亮当前区块 |
| 三语 PDF 简历 | `npm run resume` 用无头 Chrome 按打印样式导出，每语言一份 |
| 打印优化 | Cmd+P 直接得到干净纸质简历，顶部带联系方式 |
| 结构化数据 | JSON-LD `Person` + `hasCredential`，Google 可识别 |
| SEO | `canonical` + `hreflang` + `og:`/`twitter:` 分享卡 + `robots.txt` + `sitemap.xml` |
| 无障碍 | skip link、焦点样式、`aria-current`、语义化标签、减少动效支持 |

## 项目结构

```
content.json           # 全站文案（改这里）
build.mjs              # 构建编排
scripts/
  templates.mjs        # 页面模板（防御式：缺字段自动隐藏区块）
  icons.mjs            # 内联 SVG 图标与占位图形
  build-resume.mjs     # 三语 PDF 简历生成
  check.mjs            # 内容与产物校验
src/
  worker.js            # Worker：语言跳转 + /index.html 301 + 404 兜底
  assets/              # 样式、脚本、头像、图标、分享图、简历 PDF
  og-template.html     # 分享预览图源模板（不部署）
public/                # 构建产物（部署目录，已 gitignore）
```

## PDF 简历

`npm run resume` 会把 `public/` 起一个临时静态服务，用无头 Chrome 的打印功能导出 `src/assets/resume-{en,zh,fr}.pdf`，随构建拷入 `public/assets/`。

- 版式由 `src/assets/style.css` 的 `@media print` 控制，目前压到 **2 页**
- 需要本机有 Chrome / Chromium / Edge；没有时脚本只警告不中断（保留旧 PDF）
- 可用 `CHROME_PATH=/path/to/chrome npm run resume` 指定浏览器

## 社交分享预览图

三张语言独立的分享图：`src/assets/og-{en,zh,fr}.png`（1200×630），分享中文页面时显示中文卡片。

更新方法：

```bash
# 本地起一个静态服务
cd src && python3 -m http.server 8899

# 用无头 Chrome 各渲染一张
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for l in en zh fr; do
  "$CHROME" --headless=new --hide-scrollbars --window-size=1200,630 \
    --screenshot="assets/og-$l.png" "http://127.0.0.1:8899/og-template.html?lang=$l"
done
```

文案在 `src/og-template.html` 里的 `T` 对象中，按语言维护。

## 绑定自定义域名

**已绑定**：`benson.codeislaw.qzz.io`（Dashboard → Workers & Pages → `benson-ding` → 设置 → 域和路由）。

绑定后需要同步 `content.json` 的 `site.url`（影响 canonical / hreflang / og:image / sitemap），改完执行 `npm run deploy`。

> 注：上方「访问统计」章节有完整的 Web Analytics 配置说明。
2. 域名需已托管在同一 Cloudflare 账号下（自动创建 DNS 与证书）
3. 把 `content.json` 里的 `site.url` 改成新域名，再 `npm run deploy`
4. 到 [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) 刷新分享缓存
