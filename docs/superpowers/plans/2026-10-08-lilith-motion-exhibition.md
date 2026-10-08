# Lilith Motion Exhibition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Astro 站升级为暗色、沉浸式、动效驱动的 Lilith 数字展览，并保持公开/私密内容边界与 Cloudflare Pages 发布能力。

**Architecture:** 继续使用 Astro 静态站；视觉系统由 tokens、公共样式和少量原生 TypeScript 交互组成。公共页面共享 `PublicLayout`、导航、光标光晕与动效初始化，档案页面共享 `ArchiveLayout`，内容继续从 `src/data/lilith.ts` 读取。

**Tech Stack:** Astro 5、TypeScript、原生 CSS、Node.js test runner、Cloudflare Pages。

**Spec:** `docs/superpowers/specs/2026-10-08-lilith-motion-exhibition-design.md`

## Global Constraints

- 不引入 React、WebGL、自动播放音频或视频背景。
- 不复制参考站资产、文案或完整组件实现。
- `/archive/*` 保持 `noindex,nofollow`，公共导航不出现档案入口。
- 公开构建不得包含档案提示词、登录接口、凭据或私密资源路径。
- 支持键盘、320px 移动端和 `prefers-reduced-motion: reduce`。
- 使用现有压缩图片资源，避免新增大体积媒体。

## Review Focus

- JavaScript 关闭或 IntersectionObserver 不可用时，所有正文和图像仍然可见。
- 精确指针动效在触摸设备禁用，不制造横向溢出或滚动卡顿。
- 公共页面只导入 `lilithPublicProfile` / `lilithGalleryItems`，不导入 `lilithArchiveProfile`。
- 档案路由继续完整生成，公共导航和公共数据中没有 `/archive`。
- 页面元数据、焦点、alt 与减少动效路径在重构后仍存在。

---

### Task 1: 动态视觉基础与公共布局

**Files:**
- Create: `src/components/CursorAura.astro`
- Create: `src/components/MarqueeBand.astro`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/framework.css`
- Modify: `src/layouts/PublicLayout.astro`
- Modify: `src/components/SiteNav.astro`
- Modify: `src/lib/motion.ts`
- Test: `tests/experience.test.mjs`

**Interfaces:**
- Produces `CursorAura`、`MarqueeBand` 和扩展后的 `initMotion()`，供所有公开页面使用。
- CSS 提供 `.kinetic-title`, `.spotlight-card`, `.editorial-grid`, `.chapter-panel` 等页面级契约。

- [ ] 写失败测试：断言布局加载光标光晕、全局主题色为近黑/冰蓝/酒红、动效包含 reduced-motion 与触摸设备回退。
- [ ] 运行 `node --test tests/experience.test.mjs`，确认因组件和视觉契约不存在而失败。
- [ ] 实现动态视觉组件、导航和统一深色样式；扩展 `initMotion()` 支持 reveal、pointer aura 与 tilt，清理时恢复监听器。
- [ ] 运行 `node --test tests/experience.test.mjs tests/motion-accessibility.test.mjs`，确认通过。
- [ ] 提交 `feat: build immersive Lilith motion foundation`。

### Task 2: 完整首页叙事

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `tests/public-routes.test.mjs`
- Modify: `tests/experience.test.mjs`

**Interfaces:**
- Consumes Task 1 的动态视觉组件与 CSS 契约。
- Produces `/` 的六段式完整展览首页。

- [ ] 写失败测试：断言首页包含 hero、展览宣言、三个识别点、双状态、画廊入口和世界观收尾。
- [ ] 运行相关测试并确认失败。
- [ ] 使用现有公开数据和图片实现首页，保持公共数据边界。
- [ ] 运行首页与公共边界测试，确认通过。
- [ ] 提交 `feat: compose full Lilith exhibition landing page`。

### Task 3: 人物、画廊与世界页面重构

**Files:**
- Modify: `src/pages/lilith.astro`
- Modify: `src/pages/gallery.astro`
- Modify: `src/pages/world.astro`
- Modify: `tests/public-routes.test.mjs`
- Modify: `tests/experience.test.mjs`

**Interfaces:**
- Consumes Task 1 的 `.editorial-grid`, `.spotlight-card`, `.chapter-panel`。
- Produces三个视觉差异明确但设计语言统一的公开子页面。

- [ ] 写失败测试：人物页包含粘性肖像与状态章节；画廊包含聚光作品；世界页包含三个章节编号。
- [ ] 运行测试并确认失败。
- [ ] 重构三个页面，不暴露档案数据和私密入口。
- [ ] 运行公开路由、体验和边界测试，确认通过。
- [ ] 提交 `feat: redesign public Lilith exhibition routes`。

### Task 4: 档案视觉、元数据与发布边界

**Files:**
- Modify: `src/layouts/ArchiveLayout.astro`
- Modify: `src/styles/framework.css`
- Modify: `src/layouts/PublicLayout.astro`
- Create: `public/_headers`
- Modify: `tests/content-safety.test.mjs`
- Modify: `tests/experience.test.mjs`

**Interfaces:**
- 保持六个现有档案页面路径和数据接口不变。
- `_headers` 为档案路径增加 `X-Robots-Tag`，但不代替 Cloudflare Access。

- [ ] 写失败测试：断言公共元数据完整、档案布局为深色控制台、`_headers` 包含档案 noindex 规则。
- [ ] 运行测试并确认失败。
- [ ] 更新布局、档案视觉、SEO 元数据与 Pages headers。
- [ ] 运行档案和安全测试，确认通过。
- [ ] 提交 `feat: polish archive shell and release metadata`。

### Task 5: 构建、视觉 QA 与发布

**Files:**
- Modify: `design-qa.md`
- Modify: `README.md`

**Interfaces:**
- Consumes Tasks 1–4 的全部页面和交互。
- Produces经过验证的 `dist/`、QA 记录和可部署主分支。

- [ ] 运行 `pnpm run build` 后运行 `pnpm test`，确认全部通过。
- [ ] 扫描 `dist/`，确认公开页面无档案提示词、认证代码、凭据和私密资源路径。
- [ ] 以桌面和移动视口检查页面截图、横向溢出、焦点与减少动效。
- [ ] 更新 `design-qa.md` 与 `README.md`，记录当前构建和部署方式。
- [ ] 提交 `qa: verify motion exhibition release`。
- [ ] 合入 `main`、推送 GitHub、触发并验证 Cloudflare Pages 部署。
