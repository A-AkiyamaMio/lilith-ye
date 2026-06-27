# Lilith's Night

`lilith-ye.vip` 的私人角色收藏馆。当前重构版本包含新的登录/申请入口、Cloudflare Pages Functions 身份接口，以及 D1 审批数据结构。

## 本地预览

```powershell
npm start
```

静态预览位于 `http://127.0.0.1:4173`。本地静态服务器不模拟身份接口；注册、登录与会话需要在 Cloudflare Pages 环境中验证。

## Cloudflare 配置

1. 创建 D1 数据库，并在 Pages 项目中绑定为 `DB`。
2. 对数据库执行 `migrations/0001_identity.sql`。
3. 临时设置加密环境变量 `ADMIN_BOOTSTRAP_TOKEN`。
4. 使用该令牌调用一次 `/api/admin/bootstrap` 创建首位管理员。
5. 创建成功后立即删除 `ADMIN_BOOTSTRAP_TOKEN`。

生产环境中不存在前端演示账号、明文密码或 `localStorage` 用户数据库。密码通过 PBKDF2-SHA256 摘要保存，会话令牌只以 SHA-256 摘要存入 D1，并通过 `HttpOnly`、`Secure`、`SameSite=Strict` Cookie 传递。

## 测试

```powershell
npm test
```

## 部署

Cloudflare Pages 的构建命令可设为 `npm test`，输出目录设为仓库根目录。不要使用会把命令行标准错误重定向进 HTML/CSS/JS 的生成脚本。
