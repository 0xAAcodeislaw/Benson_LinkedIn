# 5 个风格预览版

基于 `main` 的内容与功能，用 `themes/*.css` 覆盖视觉层，**每个版本是独立 Worker + 独立 KV，互不干扰，也未合并进 main**。

| 风格 | 预览地址 | 分支 | Worker |
|---|---|---|---|
| Geek 终端极客风 | 见 `PREVIEW-PRIVATE.md`（本地文件，未提交） | `style/geek` | `benson-geek` |
| 赛博空间 | 同上 | `style/cyber` | `benson-cyber` |
| 我的世界 | 同上 | `style/minecraft` | `benson-minecraft` |
| 数字区块链 | 同上 | `style/blockchain` | `benson-blockchain` |
| 欧美职场风 | 同上 | `style/corporate` | `benson-corporate` |

> 5 个站的 `*.workers.dev` 已关闭（404），改用随机长子域私有预览，地址不写入公开仓库。

## 说明

- **内容**：与主站一致（经济学 / 计算分析方向），头像已同步为同一张照片
- **后台**：每个站都能独立登录改内容，KV 相互隔离；初始密码与主站相同
- **统计**：各站已清空 Web Analytics token（避免数据混进主站报表）；计数器各自独立
- **不会互相影响**：改任一风格的内容、头像、密码，都不会影响其他 4 个或主站

## 重新部署

```bash
bash scripts/deploy-variants.sh all                       # 全部
bash scripts/deploy-variants.sh geek                     # 单个
```

脚本会自动：切到对应分支 → 复制 `themes/<name>.css` → 生成独立 `wrangler.toml`（独立 Worker 名 + 独立 KV）→ 构建校验 → 提交到该分支 → 部署 → 回到 `main`。

## 调整风格

直接改 `themes/<name>.css`，然后重跑对应部署命令。主题文件是版本控制的，5 个分支各有完整副本。

## 主站不受影响

`main` 分支的 `wrangler.toml` 仍指向 `benson-ding`（正式域名 `benson.codeislaw.qzz.io`）。这些风格版是额外部署的 Worker，没有动主站配置。
