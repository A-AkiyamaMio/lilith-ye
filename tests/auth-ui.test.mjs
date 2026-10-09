import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('login page exposes one accessible administrator form without account-management distractions', async () => {
  const page = await read('src/pages/login.astro');
  const forms = page.match(/<form\b/gu) ?? [];
  assert.equal(forms.length, 1);
  assert.match(page, /for="identifier"[^>]*>[^<]*(账号|邮箱)/u);
  assert.match(page, /id="identifier"[^>]+autocomplete="username"/u);
  assert.match(page, /for="password"/u);
  assert.match(page, /id="password"[^>]+type="password"[^>]+autocomplete="current-password"/u);
  assert.match(page, /data-password-toggle/u);
  assert.match(page, /name="remember"/u);
  assert.match(page, /type="submit"/u);
  assert.match(page, /aria-live="polite"/u);
  assert.match(page, /href="\/"/u);
  assert.doesNotMatch(page, /注册|忘记密码|重置密码|mio@example|ADMIN_PASSWORD/u);
});

test('login client posts JSON, prevents duplicates, and follows only server-approved navigation', async () => {
  const client = await read('src/lib/auth-client.ts');
  assert.match(client, /export function initLoginForm/u);
  assert.match(client, /\/api\/auth\/login/u);
  assert.match(client, /method:\s*['"]POST['"]/u);
  assert.match(client, /submitButton\.disabled/u);
  assert.match(client, /payload\.next/u);
  assert.match(client, /export function initArchiveSessionControls/u);
  assert.match(client, /\/api\/auth\/logout/u);
  assert.match(client, /\/api\/auth\/session/u);
  assert.match(client, /response\.ok\s*&&\s*payload\.ok/u);
  assert.match(client, /data-logout-status/u);
  assert.match(client, /登出失败/u);
});

test('archive layout shows administrator identity and an explicit logout control', async () => {
  const layout = await read('src/layouts/ArchiveLayout.astro');
  assert.match(layout, /data-administrator-label/u);
  assert.match(layout, /data-logout/u);
  assert.match(layout, /data-logout-status[^>]+aria-live="polite"/u);
  assert.match(layout, /initArchiveSessionControls/u);
});
