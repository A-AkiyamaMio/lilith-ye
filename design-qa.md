# Design QA

## 2026-10-08 动态展览重构

- 目标：将公开站重构为暗黑、唯美、带冰蓝与暗红光感的动态角色展览，同时保留 `/archive` 档案结构。
- 公开路由：`/`、`/lilith`、`/gallery`、`/world`。
- 档案路由：`/archive`、`/archive/profile`、`/archive/appearance`、`/archive/assets`、`/archive/prompts`、`/archive/revisions`。

## 已完成检查

- `pnpm test`：25/25 通过。
- `pnpm run build`：10 个静态页面构建成功。
- 构建产物边界：公开 HTML 未发现提示词全文、登录接口、D1 配置或私密媒体路径；档案 HTML 共 6 个，全部由统一布局输出 `noindex,nofollow`。
- 资源：角色默认/备用状态图、人物参考图和吊坠参考图已压缩到公开站可接受的体积；所有公开资源都有明确 `alt` 文本。
- 动效：完成滚动显影、鼠标光晕、卡片视差、循环字带和页面转场；`prefers-reduced-motion` 路径立即显示内容且不依赖音频。
- 响应式：用 1440×1200 桌面截图检查首页和画廊，用 390×844 移动截图检查首页；移动端切换为单列并收紧导航。
- 键盘：沿用全局 `:focus-visible`、skip link 和语义链接结构。
- 发布外壳：补齐 canonical、Open Graph、Twitter Card、`_headers` 安全响应头及 `/archive/*` 的搜索引擎隔离。

## 发布说明

- 代码、静态构建、自动化测试和本地视觉检查均已完成。
- `/archive/*` 已输出 `noindex,nofollow,noarchive` 与 `no-store`；Cloudflare Access 属于边缘配置，仍需在 Cloudflare 控制台独立维持。
- 当前实现分支：`redesign/lilith-motion`；合并 `main` 后由 Cloudflare Pages 构建并发布。
