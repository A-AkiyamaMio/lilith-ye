# Lilith Archive Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将私人 Wiki 中已定稿的莉莉丝设定、选定视觉资产和档案入口同步到 `lilith-ye.vip`，同时保持公开展览与私密档案的边界。

**Architecture:** 继续使用目标站现有 Astro 静态站，不迁移源站的 Next/D1 登录系统。新增一个集中式 `src/data/lilith.ts` 作为稳定角色摘要和档案数据入口；公开页面只读取公开字段，`/archive/*` 页面读取完整档案字段，并由 Cloudflare Access 在站点外层保护。

**Tech Stack:** Astro 5、TypeScript、Markdown content collections、原生 CSS、Node.js test runner、Cloudflare Pages。

**Spec:** `docs/superpowers/specs/2026-10-06-lilith-archive-sync-design.md`

## Global Constraints

- 不迁移源站的登录、注册申请、审核台、D1 数据库、密码、会话或内部接口。
- 公开构建产物不得包含提示词全文、私密 Markdown、修订内部说明或源站登录接口。
- `/archive/*` 保持 `noindex,nofollow`，且发布前必须确认 Cloudflare Access 保护规则。
- 私密媒体不得放在没有访问控制的公开 `/assets/` 路径。
- 保留目标站已有的米白、暗红、冷蓝灰色调、衬线标题、轻量入场动效和 `prefers-reduced-motion` 降级。
- 目标站继续使用 Astro 静态构建和 Cloudflare Pages；不引入新的运行时依赖。

## Review Focus

- 源站字段和视觉资产名称变化时，迁移数据必须集中且构建失败要清楚提示；由 Task 1 的 canonical data test 覆盖。
- 公开页面不能通过公开 JSON、站点地图或预加载脚本泄露档案全文；由 Task 2 的 public route/content boundary test 覆盖。
- 档案页必须完整生成且不进入公开导航；由 Task 3 的 archive route test 覆盖。
- 私密媒体若没有独立 Access 规则不能发布；由 Task 3 的 asset-path test 和 Task 4 的 release gate 覆盖。
- 动效在减少动效模式和没有 IntersectionObserver 的浏览器中仍应立即显示内容；由 Task 4 的现有 motion accessibility test 覆盖。

---

### Task 1: 建立莉莉丝单一内容入口与公开资产层

**Files:**
- Create: `src/data/lilith.ts`
- Create: `public/assets/lilith/` 下的公开角色、肖像和吊坠资源
- Modify: `data/gallery.json`
- Test: `tests/lilith-canonical.test.mjs`

**Interfaces:**
- Produces `lilithPublicProfile`，包含 `name`, `adult`, `age`, `heightCm`, `signatures`, `states` 和公开视觉资源路径。
- Produces `lilithArchiveProfile`，包含外观字段、身体标准、吊坠规则、提示词入口和修订记录；该对象只由档案页导入。
- Produces `lilithGalleryItems`，每项包含 `id`, `title`, `caption`, `src`, `alt`, `visibility`。

- [ ] **Step 1: 写 canonical data 的失败测试**

  在 `tests/lilith-canonical.test.mjs` 中断言：`lilithPublicProfile.adult === true`、`age === 19`、`heightCm === 169`；公开签名包含暗红虹膜内圈和浅蓝五角星吊坠；所有公开资源路径以 `/assets/lilith/` 开头并且对应文件存在。

- [ ] **Step 2: 运行测试确认失败**

  Run: `node --test tests/lilith-canonical.test.mjs`
  Expected: FAIL，因为 `src/data/lilith.ts` 和公开资源尚不存在。

- [ ] **Step 3: 实现集中式数据入口并复制已确认公开资产**

  从源站已保存版本的 `appearance.ts`、`assets.ts`、`prompts.ts`、`revisions.ts` 中提取公开稳定字段；只复制目标公开页需要的角色主视觉、肖像和项链视觉资产到 `public/assets/lilith/`。不要复制源站登录背景、管理界面资源或未确认的私密媒体。`data/gallery.json` 改为引用这些公开资源，并保持 `visibility: "public"`。

- [ ] **Step 4: 运行测试确认通过**

  Run: `node --test tests/lilith-canonical.test.mjs`
  Expected: PASS，并确认所有资源路径实际存在。

- [ ] **Step 5: Commit**

  ```bash
  git add src/data/lilith.ts data/gallery.json public/assets/lilith tests/lilith-canonical.test.mjs
  git commit -m "feat: sync canonical Lilith profile and public assets"
  ```

### Task 2: 将公开展览页接入同步内容

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/lilith.astro`
- Modify: `src/pages/gallery.astro`
- Modify: `src/pages/world.astro`
- Modify: `src/components/VisualPlaceholder.astro`（仅在实际需要替换为图片组件时）
- Modify: `tests/public-routes.test.mjs`
- Modify: `tests/content-boundary.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `lilithPublicProfile` 和 `lilithGalleryItems`。
- Produces: 公开路由 `/`, `/lilith`, `/gallery`, `/world` 的稳定 HTML，包含角色摘要、三个独有记忆点和真实资源 alt 文本。

- [ ] **Step 1: 写公开路由和边界的失败测试**

  扩展 `public-routes.test.mjs`，断言公开页源码包含 `莉莉丝`、`暗红虹膜内圈` 和 `五角星吊坠`，并断言不包含提示词全文标记、后台路由和私密 Markdown 路径。扩展 `content-boundary.test.mjs`，断言公开数据集合不读取 `content/private`。

- [ ] **Step 2: 运行测试确认失败**

  Run: `node --test tests/public-routes.test.mjs tests/content-boundary.test.mjs`
  Expected: FAIL，因为页面仍有占位视觉和旧的泛化文案。

- [ ] **Step 3: 接入公开数据并替换占位视觉**

  保持现有页面结构和动效属性，把首页 hero、人物页肖像、画廊卡片和世界观页文案改为读取 Task 1 的公开数据。公开页展示成年身份、169cm 高挑比例、暗红虹膜内圈、浅蓝五角星吊坠与高马尾/披发状态；不直接导入 `lilithArchiveProfile`。

- [ ] **Step 4: 运行测试确认通过**

  Run: `node --test tests/public-routes.test.mjs tests/content-boundary.test.mjs`
  Expected: PASS。

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages src/components/VisualPlaceholder.astro tests/public-routes.test.mjs tests/content-boundary.test.mjs
  git commit -m "feat: publish canonical Lilith exhibition pages"
  ```

### Task 3: 补齐私密档案路由并隔离私密媒体

**Files:**
- Create: `src/pages/archive/index.astro`
- Create: `src/pages/archive/profile.astro`
- Create: `src/pages/archive/appearance.astro`
- Create: `src/pages/archive/assets.astro`
- Create: `src/pages/archive/prompts.astro`
- Create: `src/pages/archive/revisions.astro`
- Modify: `src/layouts/ArchiveLayout.astro`
- Modify: `tests/content-safety.test.mjs`
- Modify: `tests/smoke.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `lilithArchiveProfile` 和公开资产引用；页面使用现有 `ArchiveLayout.astro`。
- Produces: `/archive`, `/archive/profile`, `/archive/appearance`, `/archive/assets`, `/archive/prompts`, `/archive/revisions` 六个私密静态路由，所有页面输出 `noindex,nofollow`。

- [ ] **Step 1: 写档案路由和私密媒体失败测试**

  在 `content-safety.test.mjs` 断言六个档案页面存在、HTML 含 `noindex,nofollow`、公开导航 JSON 不含档案内页。断言任何档案媒体引用不使用未经保护的 `/assets/` 私密路径。

- [ ] **Step 2: 运行测试确认失败**

  Run: `node --test tests/content-safety.test.mjs tests/smoke.test.mjs`
  Expected: FAIL，因为当前只有 `ArchiveLayout.astro`，没有实际档案页面。

- [ ] **Step 3: 实现档案页面**

  使用冷月光/冰蓝银灰主题的档案布局承载完整外观、资产职责、提示词分层和修订记录。页面正文可以显示完整设定，但不能被公开页面或公开集合导入。若某张原始媒体还没有独立 Access 路径，则只显示结构化说明，不复制该媒体。

- [ ] **Step 4: 运行测试确认通过**

  Run: `node --test tests/content-safety.test.mjs tests/smoke.test.mjs`
  Expected: PASS。

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/archive src/layouts/ArchiveLayout.astro tests/content-safety.test.mjs tests/smoke.test.mjs
  git commit -m "feat: add protected Lilith archive routes"
  ```

### Task 4: 构建、视觉与发布闸门验证

**Files:**
- Modify: `tests/assets.test.mjs`（如资源命名或尺寸断言需要更新）
- Modify: `tests/motion-accessibility.test.mjs`（仅在新增组件需要额外动效断言时）
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: Tasks 1–3 的页面、数据和资源。
- Produces: 可发布的静态 `dist/`、测试结果和视觉 QA 记录；只有 Access 边界确认后才允许合入 `main`。

- [ ] **Step 1: 运行完整测试**

  Run: `npm test`
  Expected: 所有现有测试与新增测试 PASS。

- [ ] **Step 2: 构建静态站**

  Run: `npm run build`
  Expected: Astro 成功生成 `dist/`，公开路由和六个档案路由均存在，构建输出不包含源站登录接口或 D1 配置。

- [ ] **Step 3: 检查构建产物边界**

  检查 `dist/` 中的公开 JSON、站点地图、脚本和资源路径；确认提示词全文只出现在档案路由，私密媒体不落入公开 `/assets/` 路径。

- [ ] **Step 4: 更新视觉 QA 记录**

  在 `design-qa.md` 记录桌面、移动、键盘焦点、减少动效、图片加载和公开/私密边界检查结果；若无法从当前环境验证 Cloudflare Access，则明确记录为发布阻塞项。

- [ ] **Step 5: 合并并发布**

  仅在前述验证通过且 `/archive/*` Access 规则已确认时，将 `redesign/lilith-gallery` 合入 `main` 并推送 `origin main`，随后检查 Cloudflare Pages 部署状态和目标域名可访问性。

- [ ] **Step 6: Commit**

  ```bash
  git add tests/assets.test.mjs tests/motion-accessibility.test.mjs design-qa.md
  git commit -m "qa: verify Lilith archive sync for release"
  ```
