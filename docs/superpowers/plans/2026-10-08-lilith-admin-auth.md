# Lilith Administrator Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real custom administrator login to `lilith-ye.vip` and protect every `/archive` route with Cloudflare Pages Functions and D1-backed sessions.

**Architecture:** Keep Astro as a static exhibition site and add a narrow Cloudflare Pages Functions authentication layer. Administrator credentials live only in Cloudflare Secrets; D1 stores opaque session hashes and rate-limit state; `_routes.json` limits Function execution to authentication APIs and archive routes.

**Tech Stack:** Astro 5, TypeScript/browser JavaScript, Cloudflare Pages Functions, Workers Web Crypto, Cloudflare D1, Node test runner, native CSS.

**Spec:** `docs/superpowers/specs/2026-10-08-lilith-admin-auth-design.md`

## Global Constraints

- Public routes `/`, `/lilith`, `/gallery`, and `/world` stay anonymous and static.
- The only administrator account uses Cloudflare Secrets; no real identifier, password, hash, salt, session token, or secret appears in Git, browser code, logs, fixtures, or build output.
- Archive requests fail closed when credentials, D1, or session validation are unavailable.
- Cookie name is `lilith_admin_session`; attributes are `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/`.
- Sessions last 12 hours by default and 30 days with “remember me”.
- Five failures within 15 minutes block the same account/source fingerprint for 30 minutes.
- PBKDF2 uses SHA-256, 600,000 iterations, and a 32-byte derived key; session tokens and generated salts use 32 cryptographically random bytes.
- Login accepts JSON bodies up to 8 KiB, identifiers up to 254 characters, and passwords up to 256 characters.
- There is no registration, password reset, multi-user role system, or content editor.
- Existing `.pnpm-store/` remains untouched and uncommitted.

## Review Focus

- Malformed JSON, oversized bodies, missing headers, and non-string form values return controlled 400/403 responses without leaking internals; Task 2 tests each class.
- Mixed-case email/username and surrounding whitespace normalize consistently while passwords remain byte-for-byte significant; Task 1 and Task 2 pin this behavior.
- Concurrent failed logins cannot reset or bypass the five-attempt limit; Task 1 tests the D1 upsert contract and Task 2 tests the blocked response.
- Encoded, protocol-relative, backslash, and non-archive `next` values cannot become open redirects; Task 1 tests the complete allowlist.
- Missing or corrupt session rows, D1 errors, and missing Secrets never call the static archive asset handler; Task 3 tests fail-closed middleware behavior.

---

### Task 1: Authentication primitives and D1 persistence

**Files:**
- Create: `functions/_lib/auth.js`
- Create: `functions/_lib/store.js`
- Create: `migrations/0001_admin_auth.sql`
- Create: `tests/auth-core.test.mjs`
- Create: `tests/auth-store.test.mjs`

**Interfaces:**
- Produces from `auth.js`: `normalizeIdentifier(value)`, `derivePasswordHash(password, salt)`, `verifyAdminCredentials(env, identifier, password)`, `randomSessionToken()`, `hashOpaqueValue(secret, value)`, `readCookie(request, name)`, `sessionCookie(token, maxAge)`, `expiredSessionCookie()`, `safeArchiveNext(value)`, `assertSameOrigin(request)`.
- Produces from `store.js`: `createSession(db, record)`, `findSession(db, tokenHash, now)`, `deleteSession(db, tokenHash)`, `clearExpiredSessions(db, now)`, `readAttempt(db, fingerprint, now)`, `recordFailure(db, fingerprint, now)`, `clearFailures(db, fingerprint)`.
- D1 records use Unix seconds; `recordFailure` returns `{ failures, blockedUntil }`.
- `auth_sessions` columns are `token_hash`, `created_at`, `expires_at`, and `last_seen_at`; `auth_attempts` columns are `fingerprint`, `failures`, `window_started_at`, and `blocked_until`.

- [ ] **Step 1: Write failing crypto, normalization, cookie, origin, and redirect tests**

Add tests asserting: identifiers trim and lowercase; passwords are not normalized; PBKDF2 uses 600,000 SHA-256 iterations and a 32-byte key; opaque HMAC values are stable; cookies contain every required flag and exact 12-hour/30-day durations; only `/archive` and `/archive/...` survive `safeArchiveNext`; encoded external URLs, `//host`, backslashes, and public paths become `/archive/`; wrong origins throw a controlled error.

- [ ] **Step 2: Run the core tests and verify they fail**

Run: `node --test tests/auth-core.test.mjs`

Expected: FAIL because `functions/_lib/auth.js` does not exist.

- [ ] **Step 3: Implement the authentication primitives**

Use Workers Web Crypto only. `verifyAdminCredentials` must validate `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `ADMIN_PASSWORD_SALT`, perform the password derivation even for an unknown identifier, and return one boolean without revealing which field failed.

- [ ] **Step 4: Run the core tests and verify they pass**

Run: `node --test tests/auth-core.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write failing migration and D1 store tests**

Assert that the migration creates `auth_sessions` and `auth_attempts` with primary keys and expiry/block indexes. Use a deterministic fake D1 prepared-statement adapter to assert bound SQL parameters, five-failure blocking, 15-minute window reset, successful clearing, session expiry rejection, deletion, and cleanup. Include two interleaved failure calls to pin the atomic upsert behavior.

- [ ] **Step 6: Run the store tests and verify they fail**

Run: `node --test tests/auth-store.test.mjs`

Expected: FAIL because the store and migration do not exist.

- [ ] **Step 7: Implement the migration and persistence helpers**

Use one atomic D1 upsert for failure counting. Store only token hashes and HMAC fingerprints; never store raw session tokens, identifiers, passwords, or IP addresses.

- [ ] **Step 8: Run both Task 1 suites**

Run: `node --test tests/auth-core.test.mjs tests/auth-store.test.mjs`

Expected: all Task 1 tests PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add functions/_lib/auth.js functions/_lib/store.js migrations/0001_admin_auth.sql tests/auth-core.test.mjs tests/auth-store.test.mjs
git commit -m "feat: add administrator auth primitives"
```

### Task 2: Login, session, and logout Functions

**Files:**
- Create: `functions/api/auth/login.js`
- Create: `functions/api/auth/session.js`
- Create: `functions/api/auth/logout.js`
- Create: `tests/auth-functions.test.mjs`

**Interfaces:**
- Consumes: Task 1 auth and store exports.
- Produces: `onRequestPost(context)` from login/logout and `onRequestGet(context)` from session.
- Login JSON: `{ ok: true, next: string }` on success; `{ ok: false, message: string, retryAfter?: number }` otherwise.
- Session JSON: `{ authenticated: true, administrator: { label: 'Mio' } }` or `{ authenticated: false }`.

- [ ] **Step 1: Write failing handler tests**

Call exported handlers with real `Request` objects and a fake `AUTH_DB`. Cover username login, email login, mixed case and whitespace, wrong identifier/password with identical messages, missing Secrets, missing D1, malformed JSON, non-string values, bodies over 8 KiB, overlong identifier/password, missing/wrong `Origin`, remember-me duration, rate-limit transition at attempt five, and session creation. Assert status codes are 400 for malformed values, 401 for invalid credentials, 403 for origin failures, 413 for oversized input, 429 with `Retry-After` for blocks, and 503 for missing runtime configuration. Responses never contain thrown error text or credential details.

- [ ] **Step 2: Run the Function tests and verify they fail**

Run: `node --test tests/auth-functions.test.mjs`

Expected: FAIL because the handlers do not exist.

- [ ] **Step 3: Implement the three handlers**

Login creates a 32-byte opaque token, stores only its HMAC hash, clears failures on success, and sets the secure cookie. Session returns only the fixed display label. Logout is same-origin POST, deletes the current hashed token when possible, and always clears the cookie.

- [ ] **Step 4: Run the Function tests and verify they pass**

Run: `node --test tests/auth-functions.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add functions/api/auth tests/auth-functions.test.mjs
git commit -m "feat: add administrator auth endpoints"
```

### Task 3: Fail-closed archive middleware and Function routing

**Files:**
- Create: `functions/_middleware.js`
- Create: `public/_routes.json`
- Create: `tests/auth-middleware.test.mjs`
- Modify: `tests/release-shell.test.mjs`

**Interfaces:**
- Consumes: Task 1 `readCookie`, `hashOpaqueValue`, `findSession`, and `safeArchiveNext`.
- Produces: `onRequest(context)` middleware that either calls `context.next()` or returns a redirect/service response.

- [ ] **Step 1: Write failing middleware and routing tests**

Assert: no cookie redirects to `/login/?next=<encoded archive path>`; valid session calls `next`; malformed, unknown, expired, or deleted sessions redirect; missing Secrets/D1 and D1 exceptions return 503 or redirect without calling `next`; `/archive` and `/archive/*` are included in `_routes.json`; auth APIs are included; public pages and static assets are excluded.

- [ ] **Step 2: Run the middleware tests and verify they fail**

Run: `node --test tests/auth-middleware.test.mjs tests/release-shell.test.mjs`

Expected: FAIL because middleware and routes are absent.

- [ ] **Step 3: Implement middleware and route scoping**

Keep the middleware free of UI rendering. Preserve the full same-origin archive path and query through `safeArchiveNext`; never redirect to a user-supplied host. Retain existing archive `noindex`, `noarchive`, and `no-store` headers.

- [ ] **Step 4: Run the middleware and release-shell tests**

Run: `node --test tests/auth-middleware.test.mjs tests/release-shell.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add functions/_middleware.js public/_routes.json tests/auth-middleware.test.mjs tests/release-shell.test.mjs
git commit -m "feat: protect private archive routes"
```

### Task 4: Custom login experience and archive identity controls

**Files:**
- Create: `src/pages/login.astro`
- Create: `src/styles/auth.css`
- Create: `src/lib/auth-client.ts`
- Modify: `src/components/SiteNav.astro`
- Modify: `src/layouts/ArchiveLayout.astro`
- Create: `tests/auth-ui.test.mjs`
- Modify: `tests/public-routes.test.mjs`

**Interfaces:**
- Produces from `auth-client.ts`: `initLoginForm()` and `initArchiveSessionControls()`.
- Login form fields: `identifier`, `password`, `remember`; status uses `aria-live="polite"`.
- Public navigation links to `/login/`, never directly to `/archive`.

- [ ] **Step 1: Write failing page-source tests**

Assert: `/login/` has one form, username-or-email and password labels, password visibility control, remember checkbox, submit/status elements, return-to-exhibition link, no registration/reset controls, and no real credentials. Assert SiteNav links to `/login/` but not `/archive`. Assert ArchiveLayout contains administrator label, POST logout control, and client initializer.

- [ ] **Step 2: Run the UI tests and verify they fail**

Run: `node --test tests/auth-ui.test.mjs tests/public-routes.test.mjs`

Expected: FAIL because the login page and controls do not exist.

- [ ] **Step 3: Implement login markup and client behavior**

`initLoginForm` submits JSON to `/api/auth/login`, disables duplicate submission, shows accessible loading/error/blocked/service states, toggles password visibility, and navigates only to the server-returned safe archive path. It may call `/api/auth/session` on load to forward an already authenticated administrator.

- [ ] **Step 4: Implement the visual layer and archive controls**

Use the current black/ice/wine tokens, large restrained typography, one signature mirror/light motion, responsive stacking, and reduced-motion fallback. `initArchiveSessionControls` loads the fixed administrator label and performs POST logout before returning to `/login/`.

- [ ] **Step 5: Run UI and accessibility-related tests**

Run: `node --test tests/auth-ui.test.mjs tests/public-routes.test.mjs tests/motion-accessibility.test.mjs tests/experience.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/pages/login.astro src/styles/auth.css src/lib/auth-client.ts src/components/SiteNav.astro src/layouts/ArchiveLayout.astro tests/auth-ui.test.mjs tests/public-routes.test.mjs
git commit -m "feat: restore Lilith administrator login"
```

### Task 5: Root publishing, documentation, and local release verification

**Files:**
- Modify: `scripts/publish-root.mjs`
- Modify: `tests/root-publish.test.mjs`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: Astro output for `/login/` and `public/_routes.json`.
- Produces: repository-root `login/index.html` and `_routes.json` while preserving root `functions/` and `migrations/` source directories.

- [ ] **Step 1: Extend the failing root-publish test**

Assert that the publisher mirrors `login`, copies `_routes.json`, leaves `functions` and `migrations` out of its generated-directory deletion list, and the package still runs build before publishing. Assert `.dev.vars*` and `.env*` are ignored.

- [ ] **Step 2: Run the publishing test and verify it fails**

Run: `node --test tests/root-publish.test.mjs`

Expected: FAIL because login and route configuration are not published yet.

- [ ] **Step 3: Update publishing and deployment documentation**

Document only required binding/Secret names, migration command shape, local fake-value testing, and fail-closed deployment order. Do not include real values.

- [ ] **Step 4: Run the complete test and build pipeline**

Run: `pnpm test`

Expected: all tests PASS.

Run: `pnpm run publish:root`

Expected: Astro build succeeds; root output contains `login/index.html`, `_routes.json`, all ten previous pages, and static assets; `functions/` and `migrations/` remain intact.

- [ ] **Step 5: Scan tracked and generated files for credential leakage**

Use exact values only as in-memory comparison inputs sourced from the local Wiki; never echo them. Scan Git-tracked files, `dist/`, and published root HTML/JS. Expected: zero matches for real identifier, email, raw password, generated password hash, salt, and session secret.

- [ ] **Step 6: Commit Task 5**

```bash
git add scripts/publish-root.mjs tests/root-publish.test.mjs .gitignore README.md login _routes.json _astro index.html archive gallery lilith world assets _headers
git commit -m "chore: publish authenticated archive shell"
```

### Task 6: Cloudflare configuration, deployment, and knowledge-base handoff

**Files:**
- Modify: `design-qa.md`
- Modify outside repo: `D:\Wiki Of Mio\wiki\项目 - lilith-ye.vip.md`
- Append outside repo: `D:\Wiki Of Mio\log.md`

**Interfaces:**
- Consumes: existing Pages project `lilith-ye`, existing D1 database `lilith-ye-db`, local Wiki administrator values, and Tasks 1–5 commits.
- Produces: configured `AUTH_DB` binding, five encrypted Secrets in Production/Preview, deployed authentication, and verified Wiki status.

- [ ] **Step 1: Confirm Cloudflare CLI/dashboard access without exposing credentials**

Check the authenticated account and Pages project. If interactive OAuth is required, open the official Cloudflare authorization flow for Mio; do not read credentials from the Wiki into browser fields unless explicitly needed.

- [ ] **Step 2: Apply D1 migration and verify schema**

Apply `migrations/0001_admin_auth.sql` to `lilith-ye-db`; query only table/index names. Expected: both auth tables and their indexes exist, with no user credentials stored.

- [ ] **Step 3: Configure binding and Secrets**

Bind `AUTH_DB` to `lilith-ye-db` in Preview and Production. Generate a random salt and session secret locally; derive the PBKDF2 hash from the existing Wiki password without printing the password. Store `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD_SALT`, and `SESSION_SECRET` as encrypted Secrets.

- [ ] **Step 4: Re-run local release checks, then push `main`**

Run: `pnpm test`

Run: `pnpm run publish:root`

Run: `git status --short`

Expected: tests/build pass; only the pre-existing `.pnpm-store/` is untracked; `main` contains the planned commits.

Push: `git push origin main`

- [ ] **Step 5: Verify production behavior**

Check: `/login/` is 200; anonymous `/archive/` redirects to same-origin login; wrong credentials return one generic message; valid username and email login both work; default and remembered cookies have the expected flags/expiry; all six archive pages load after login; logout invalidates the session; old cookies fail; public routes remain 200; archive responses retain `noindex/noarchive/no-store`.

- [ ] **Step 6: Run visual QA**

Capture and inspect desktop and 390px mobile screenshots for login, login error, archive administrator controls, and reduced-motion behavior. Fix any clipping, focus, contrast, or animation issue before completion.

- [ ] **Step 7: Record verified release state**

Update `design-qa.md` with exact test count, commit, deployment result, route checks, and screenshots. Update the existing Wiki project page (no new index entry required) and append one `## [2026-10-08] organize | ... @GPT` log entry. Preserve UTF-8 BOM + CRLF and never copy Secrets into the Wiki log.

- [ ] **Step 8: Commit/push QA documentation and verify clean state**

```bash
git add design-qa.md
git commit -m "docs: verify administrator authentication"
git push origin main
```

Run final `git status --short`; expected only `?? .pnpm-store/`. Recheck live login and archive interception after the documentation deployment.
