# Lilith · Velvet Mirror

莉莉丝角色主题站。源码托管于 GitHub，通过 Cloudflare Pages 自动部署，账号系统使用 Supabase Auth。

## Supabase 配置

在 `config.js` 中填写项目 URL 和公开的 anon key，并在 Supabase Authentication 中把站点 URL 设置为 `https://lilith-ye.vip`。

## Cloudflare Pages

- Production branch: `main`
- Framework preset: `None`
- Build command: 留空
- Build output directory: `/`
- Custom domain: `lilith-ye.vip`

## 本地预览

使用任意静态服务器打开项目根目录。请勿直接双击 `index.html`，否则部分浏览器会限制模块和认证回调。
