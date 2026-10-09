# Lilith · Velvet Exhibition

内容驱动的 Lilith 数字展览与受邀私人档案馆。

## 本地开发

```text
npm install
npm run dev
```

生产构建使用 `npm run build`，本地检查构建结果使用 `npm run preview`，测试使用 `npm test`。

当前 Cloudflare Pages 项目直接发布仓库根目录。发布前运行 `pnpm run publish:root`，它会先构建 Astro，再把生产页面与静态资源同步到根目录发布镜像。

## 内容维护

- `content/public/`：公开展览内容。
- `content/private/`：Cloudflare Access 保护的私人档案内容。
- `data/`：导航、画廊和时间线等结构化数据。
- `public/assets/`：网站图片与纹理资源。

编辑 Markdown/JSON 后提交 GitHub，Cloudflare Pages 会重新构建网站。私人内容不得复制到公开 JSON、公开脚本或公开站点地图中。

## 访问控制

私人档案使用 Cloudflare Pages Functions 与 D1 会话验证保护。`/archive` 和 `/archive/*` 必须由 `functions/_middleware.js` 拦截；`public/_routes.json` 将 Functions 执行限制在档案及 `/api/auth/*`，公开展览和静态资源继续直接由 Pages 提供。

部署前先为 Pages 项目绑定现有 D1 数据库 `lilith-ye-db`，绑定名称为 `AUTH_DB`，并在 Preview 与 Production 环境分别设置以下加密 Secrets：

- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_PASSWORD_SALT`
- `SESSION_SECRET`

密码哈希使用 PBKDF2-HMAC-SHA-256、600,000 次迭代和 32 字节输出；盐与会话密钥应使用密码学安全随机数生成。只把哈希、盐和密钥放入 Cloudflare Secrets，不要把密码或密钥写入仓库、命令历史或日志。`.env*` 与 `.dev.vars*` 已加入忽略规则。

在 Cloudflare CLI 已登录后，把迁移应用到远程数据库：

```text
wrangler d1 migrations apply lilith-ye-db --remote
```

用 `wrangler pages secret put <SECRET_NAME> --project-name lilith-ye` 添加加密 Secret。不要把 Secret 值作为命令参数；在提示符中输入。先发布 Preview 并验证登录、注销及全部档案路由，再发布 Production。缺少 Secrets 或 D1 时，档案中间件会返回不可用响应，不会放行静态档案。

## 安全

不要把密码、令牌、API 密钥或其他凭据写入仓库、构建产物或前端配置。网站内容保持成人、非露骨和非色情化的艺术表达。

## 视觉 QA

发布前检查桌面端、移动端、键盘操作、`prefers-reduced-motion`、公开/私人边界和图片加载。最终记录写入 `design-qa.md`。
