# Design QA

## 本次同步范围

- 来源：私人 Wiki Sites 版本 `c194af3` 的莉莉丝设定、最终状态图和吊坠参考图。
- 目标：Astro 公开展览 + `/archive` 私密档案结构。
- 公开路由：`/`、`/lilith`、`/gallery`、`/world`。
- 档案路由：`/archive`、`/archive/profile`、`/archive/appearance`、`/archive/assets`、`/archive/prompts`、`/archive/revisions`。

## 已完成检查

- `pnpm test`：18/18 通过。
- `ASTRO_TELEMETRY_DISABLED=1 pnpm run build`：10 个静态页面构建成功。
- 构建产物边界：公开 HTML 未发现提示词全文、登录接口、D1 配置或私密媒体路径；档案 HTML 共 6 个，全部由统一布局输出 `noindex,nofollow`。
- 资源：角色默认/备用状态图、人物参考图和吊坠参考图已压缩到公开站可接受的体积；所有公开资源都有明确 `alt` 文本。
- 动效：保留入场 reveal、画廊悬停和页面转场；`prefers-reduced-motion` 路径仍然立即显示内容，不依赖音频。
- 响应式：保留目标站原有移动端单列、档案导航横向滚动和无横向溢出规则；人物状态卡在窄屏切换为单列。
- 键盘：沿用全局 `:focus-visible`、skip link 和语义链接结构。

## 发布闸门

- 代码与静态构建已准备好。
- `/archive/*` 的 Cloudflare Access 保护规则无法从当前仓库和本地构建环境确认；在规则确认前不合入 `main`，避免私密档案页面被公开访问。
- 当前分支：`redesign/lilith-gallery`。等待 Access 确认后，再合并到 `main`、推送 GitHub 并检查 Cloudflare Pages 部署。
