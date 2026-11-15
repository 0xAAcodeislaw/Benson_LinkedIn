# 给预览站加 Cloudflare Access 保护（手动教程）

> **现已改用零成本方案**：在 Worker 里加访问口令网关（见文末「零成本替代方案」）。
> Cloudflare Zero Trust 免费版也要绑卡，且 API 需要 `access:write` 权限，已放弃。
> 本章节保留作为「如果以后想用官方 Access」的参考。

## 原理（先懂这个）

Cloudflare Access 是**边缘身份验证网关**：

```
访客 → 私有域名 → Cloudflare 边缘（先检查 Access 会话）
                    ├─ 未登录 → 跳转登录页（邮箱收一次性验证码）
                    └─ 已登录 → 放行到 Worker → 返回页面
```

关键：**请求在到达 Worker 之前就被拦住**。所以就算域名在 CT log 里公开、被扫到，
扫描器拿到的也只是登录页，看不到简历内容。这才是「密码」逻辑的正确用法 ——
把秘密放在「只有你知道的东西」上，而不是放在门牌号长短上。

## 第 1 步：初始化 Zero Trust（一次性）

1. 打开 https://one.dash.cloudflare.com/
2. 选你的账号，首次进入会引导创建 **Zero Trust organization**
3. 选免费计划（Free，50 用户额度），一路确认

> 免费，不需要信用卡。一个账号只需做一次。

## 第 2 步：创建有权限的 API Token（一次性）

1. https://dash.cloudflare.com/profile/api-tokens → **Create Token**
2. 用 **Custom token** → **Get started**
3. 权限加两条：
   - `Account` → `Zero Trust` → `Edit`（或 `Access: Apps and Policies` → `Edit`）
   - `Account` → `Account Settings` → `Read`（脚本要用 account id，可选）
4. **Account Resources** → Include → 选你的账号
5. 创建后**复制 token**（只显示一次）

把它交给 ZCode，或自己设进环境变量：

```bash
export CF_ACCESS_TOKEN="粘贴这里"
```

## 第 3 步：跑脚本（一条命令）

```bash
bash scripts/add-access.sh
```

脚本做的事（可读 `scripts/add-access.sh` 逐行对照）：

| 行 | 动作 |
|---|---|
| 取 token | 优先用 `CF_ACCESS_TOKEN`，没有则用 wrangler 的 OAuth token |
| 每个域名 | `GET /access/apps` 查重，避免重复建 |
| 建应用 | `POST /access/apps`，`type: self_hosted`，`domain` = 私有预览域名 |
| 登录方式 | `allowed_idps: []` = Cloudflare 内置 **One-time PIN**（邮箱收验证码），无需配 IdP |
| 策略 | `POST/PUT policies`：`decision: allow` + `include: [{email: {email: "你的邮箱"}}]` |
| 会话 | `session_duration: "24h"`，一天后重新验证 |

## 第 4 步：验证

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://<私有域名>/en/
# 期望 302 → 跳到 Cloudflare Access 登录页
```

浏览器打开任一私有域名 → 输入 `0xaa.codeislaw@gmail.com` → 收验证码 → 才能看到简历。

## 完全手动版（不跑脚本，纯 Dashboard）

1. https://one.dash.cloudflare.com/ → **Access** → **Applications** → **Add an application**
2. 选 **Self-hosted**
3. 填：
   - Application name: `Preview: geek`（每个站一个）
   - Session Duration: `24 hours`
   - Application domain: 填私有预览域名（如 `pv-geek-xxx.codeislaw.qzz.io`）
4. Identity providers：**只勾 `One-time PIN`**（其他不勾）
5. 下一步 → **Add a policy**：
   - Policy name: `Only me`
   - Action: `Allow`
   - **Include** → 选择器选 `Emails` → 值填 `0xaa.codeislaw@gmail.com`
6. 保存。5 个域名重复 5 次。

## 常见坑

| 现象 | 原因 | 解法 |
|---|---|---|
| `auth.forbidden (1010)` | API token 没有 Zero Trust 写权限 | 按第 2 步加 `Zero Trust: Edit` |
| `Authentication error (10000)` | 用了 zone 级端点 / token 类型不对 | 用 **Account 级** `/accounts/{id}/access/apps` |
| 建完还是能直接访问 | Access 应用 domain 和证书域名不一致（少了 `www`、多了路径） | domain 必须**精确等于** hostname，不带 `/*`、不带 `https://` |
| 收不到验证码 | 邮箱不在策略 include 里 | 检查 policy 的 email 是否拼对 |
| 主站被误保护 | 应用 domain 填错成主域名 | 每个应用只填一个预览子域；主站不建应用 |

## 撤销保护

Access → Applications → 删掉对应应用即可，立刻恢复直接访问。
不想用了也可以直接把 5 个 Worker 删掉（分支代码仍在 GitHub）。


## 零成本替代方案（已实际启用）

不用 Zero Trust、不用绑卡、不用 API Token —— 直接在 Worker 入口加一层口令。

**原理**：`src/preview-gate.js` 在 `fetch()` 最前面检查签名 Cookie，
`env.PREVIEW_PASSWORD` 存在时未登录一律返回 401 解锁页；主站不设这个变量，网关完全跳过。

**改口令**（每个 Worker 一条命令，立刻生效，不用重新部署）：

```bash
echo "新口令" | npx wrangler secret put PREVIEW_PASSWORD --name benson-geek
```

**批量**：

```bash
for v in geek cyber minecraft blockchain corporate; do
  echo "新口令" | npx wrangler secret put PREVIEW_PASSWORD --name "benson-$v"
done
```

**效果对比**：

| | Cloudflare Access | Worker 口令网关 |
|---|---|---|
| 绑卡 | 需要 | **不需要** |
| 额外服务 | Zero Trust 组织 | 无（复用现有 Worker） |
| 身份方式 | 邮箱验证码 / SSO | 单口令 |
| 拦在哪 | 边缘（比 Worker 更早） | Worker 入口（已足够） |
| 配置 | Dashboard 5 个应用 | 5 条 secret 命令 |

对「防扫描」这个目标，两者等效：扫描器拿到的都是登录页，看不到简历内容。
