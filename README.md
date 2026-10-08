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

生产环境应保护 `lilith-ye.vip/archive/*`，只允许 Cloudflare Access 邀请的身份访问。访问控制由 Cloudflare 边缘策略负责，不能用前端隐藏代替。

## 安全

不要把密码、令牌、API 密钥或其他凭据写入仓库、构建产物或前端配置。网站内容保持成人、非露骨和非色情化的艺术表达。

## 视觉 QA

发布前检查桌面端、移动端、键盘操作、`prefers-reduced-motion`、公开/私人边界和图片加载。最终记录写入 `design-qa.md`。
