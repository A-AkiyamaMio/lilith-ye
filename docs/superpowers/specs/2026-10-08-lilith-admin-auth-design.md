# Lilith 管理员登录与档案保护设计

日期：2026-10-08

状态：Mio 已确认采用自定义账号密码登录

## 目标

为 `lilith-ye.vip` 恢复与新版视觉一致的登录入口，并让 Mio 以唯一管理员身份进入 `/archive/*`。认证必须在 Cloudflare 边缘执行；未登录请求不能读取档案 HTML。现有公开展览页继续开放。

成功标准：

- `/login/` 提供完整、响应式、可访问的莉莉丝主题登录体验。
- Wiki 中现有管理员用户名或邮箱可以登录，但真实账号值和密码不进入公开仓库、浏览器脚本或构建产物。
- `/archive` 与 `/archive/*` 在服务端验证会话；未登录、伪造、过期或已退出的会话均被拒绝。
- 登录、退出、记住登录、失败限流和失效会话均可自动测试并在线验证。

## 范围

本次包含：

- 自定义登录页。
- 唯一管理员账号的服务端认证。
- 档案路由中间件。
- 安全会话、退出登录、失败次数限制。
- Cloudflare Pages Functions、D1 绑定、Secrets 和部署验证。

本次不包含：

- 注册、邀请、忘记密码或邮件找回。
- 多管理员、角色权限和内容管理后台。
- 在网站上修改 Wiki、图片或站点内容。
- 把任何 Wiki 凭据同步到 GitHub。

## 选定架构

继续保留 Astro 静态站，增加 Cloudflare Pages Functions 作为认证边缘层。认证代码位于仓库根目录 `functions/`；静态页面仍由当前根目录发布流程提供。

主要路由：

- `GET /login/`：Astro 生成的公开登录页。
- `POST /api/auth/login`：验证账号与密码，成功后创建会话。
- `POST /api/auth/logout`：删除当前会话并清除 Cookie。
- `GET /api/auth/session`：供登录页和档案页确认当前身份，只返回最小管理员信息。
- `/archive`、`/archive/*`：由 Pages Functions 中间件拦截，通过后才交给静态资源服务器。

`_routes.json` 只让 Functions 处理认证接口与档案路径，公开页面和静态资源不经过认证函数，避免不必要的调用和延迟。

## 管理员凭据

管理员账号沿用 Wiki 中已经保存的资料，登录输入框支持“用户名或邮箱”。真实值不写入设计稿、代码或测试夹具。

Cloudflare 生产环境保存以下加密 Secrets：

- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_PASSWORD_SALT`
- `SESSION_SECRET`

密码使用 PBKDF2-SHA-256 派生后比较；盐和哈希只存在于 Cloudflare Secrets。比较使用固定时长逻辑，错误响应不区分“账号不存在”与“密码错误”。原始密码不会出现在日志、响应、Cookie、D1 或 GitHub 中。

如果任何必需 Secret 缺失，认证系统必须失败关闭：登录接口返回临时不可用，档案路由继续拒绝访问，不能退化为公开页面。

## 会话与 D1

复用现有 Cloudflare D1 数据库 `lilith-ye-db`，绑定名为 `AUTH_DB`。新增两张独立表：

- `auth_sessions`：保存随机会话令牌的哈希、创建时间、过期时间和最后访问时间。
- `auth_attempts`：保存账号与来源地址的不可逆指纹、失败次数、窗口开始时间和封禁截止时间。

浏览器只保存随机不透明令牌，Cookie 名为 `lilith_admin_session`，属性为：

- `HttpOnly`
- `Secure`
- `SameSite=Strict`
- `Path=/`
- 默认 12 小时；勾选“记住我”时 30 天

退出登录时删除 D1 会话并清空 Cookie。过期记录在认证请求中顺带清理，不建立额外定时任务。

## 登录失败限制

同一账号与来源指纹在 15 分钟内最多失败 5 次；超过后封禁 30 分钟。成功登录会清除对应失败记录。

来源地址只经过带 `SESSION_SECRET` 的 HMAC 后写入 D1，不保存原始 IP。登录接口只接受同源 `POST`，检查 `Origin`，限制请求体大小，并始终返回通用错误文案。

## 页面体验

登录页沿用当前黑、冰白、暗酒红视觉系统和动势排版，但不照搬旧版 Supabase 页面。页面由以下部分组成：

- 莉莉丝品牌锁定区与“私人档案”说明。
- 用户名或邮箱输入框。
- 密码输入框与显示切换。
- “记住我”。
- 主操作“进入档案”。
- 返回公开展览的次级入口。
- 登录中、失败、封禁、服务不可用等可访问状态提示。

不展示注册、找回密码或虚假的社交登录按钮。登录成功后安全跳转到同站 `/archive/`；只允许站内 `next` 路径，防止开放重定向。

档案布局显示最小管理员标识和“退出登录”。退出使用 `POST`，完成后返回 `/login/`。

动效遵守现有 `prefers-reduced-motion` 规则；键盘焦点、错误提示、密码可见状态和移动端布局必须可用。

## 文件与发布结构

预计新增或修改：

- `src/pages/login.astro`
- `src/layouts/ArchiveLayout.astro`
- `src/styles/framework.css` 或独立登录样式文件
- `src/lib/auth-client.ts`
- `functions/_middleware.js`
- `functions/api/auth/login.js`
- `functions/api/auth/logout.js`
- `functions/api/auth/session.js`
- `functions/_lib/auth.js`
- `migrations/0001_admin_auth.sql`
- `public/_routes.json`
- `scripts/publish-root.mjs`
- 认证与发布相关测试

根目录发布脚本必须继续镜像 Astro 的 `dist`，同时保留仓库根目录的 `functions/` 与迁移文件，不能把服务端代码复制进浏览器静态资源，也不能删除它们。

## 部署顺序

1. 在现有 D1 数据库应用认证迁移。
2. 在 Cloudflare Pages 项目绑定 `AUTH_DB`。
3. 在 Production 与 Preview 环境设置五个加密 Secrets。
4. 本地运行测试、Astro 构建和根目录发布检查。
5. 推送 GitHub `main`，等待 Cloudflare Git 部署。
6. 在线验证登录、错误密码、封禁、记住登录、档案拦截和退出。

Secrets、D1 绑定或迁移未完成前，不推送会启用认证路由的生产提交，避免出现半配置状态。

## 测试与验收

自动测试至少覆盖：

- 正确用户名与正确邮箱均可登录。
- 错误账号和错误密码返回相同提示。
- Cookie 安全属性与默认/记住登录有效期正确。
- 未登录、伪造、过期、退出后的会话无法访问所有档案路由。
- 登录失败计数、封禁与成功清除记录正确。
- `next` 只接受站内档案路径。
- 必需 Secrets 或 D1 缺失时失败关闭。
- 公开页面不经过认证且继续构建。
- 根目录发布结果包含登录页与 `_routes.json`，不包含真实凭据。

线上验收：

- `/login/` 返回 200，桌面与移动端视觉正常。
- 未登录请求 `/archive/` 被重定向到登录页。
- 管理员登录后可以访问全部六个档案页面。
- 退出后原会话立即失效。
- GitHub 搜索与构建产物扫描找不到真实账号值、原始密码、密码哈希、盐或会话密钥。

## 安全边界

- Wiki 仍是本地资料，不参与部署，也不作为运行时账号数据库。
- 公开仓库只保存变量名、协议和测试用假数据。
- 不使用前端硬编码密码、LocalStorage 身份标记、隐藏链接或纯 JavaScript 路由守卫冒充认证。
- 档案 HTML 必须经过边缘中间件后才能返回；`noindex`、`no-store` 继续保留，但它们不替代认证。
- 任何部署异常优先拒绝档案访问，不能为了“网站可打开”而绕过身份校验。
