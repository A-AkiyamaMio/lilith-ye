import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('public pages publish canonical and social metadata for lilith-ye.vip', () => {
  const config = read('astro.config.mjs');
  const layout = read('src/layouts/PublicLayout.astro');
  assert.match(config, /site:\s*['"]https:\/\/lilith-ye\.vip['"]/);
  assert.match(layout, /rel="canonical"/);
  assert.match(layout, /property="og:title"/);
  assert.match(layout, /property="og:image"/);
  assert.match(layout, /name="twitter:card"/);
});

test('deployment headers protect the archive and harden all routes', () => {
  const headers = read('public/_headers');
  assert.match(headers, /\/archive\/\*/);
  assert.match(headers, /X-Robots-Tag:\s*noindex, nofollow, noarchive/);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /Permissions-Policy:/);
});

test('Pages Functions run only for archive protection and authentication APIs', () => {
  const routes = JSON.parse(read('public/_routes.json'));
  assert.equal(routes.version, 1);
  assert.ok(routes.include.includes('/archive'));
  assert.ok(routes.include.includes('/archive/*'));
  assert.ok(routes.include.includes('/api/auth/*'));
  for (const publicPath of ['/', '/lilith/*', '/gallery/*', '/world/*', '/_astro/*', '/assets/*']) {
    assert.equal(routes.include.includes(publicPath), false);
  }
});
