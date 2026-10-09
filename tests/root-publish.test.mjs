import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('root publishing command mirrors the Astro routes Cloudflare currently serves', () => {
  const packageJson = JSON.parse(read('package.json'));
  const script = read('scripts/publish-root.mjs');
  assert.match(packageJson.scripts['publish:root'], /scripts\/publish-root\.mjs/);
  for (const route of ['_astro', 'archive', 'gallery', 'lilith', 'world', 'login']) {
    assert.match(script, new RegExp(`['"]${route}['"]`));
  }
  assert.match(script, /index\.html/);
  assert.match(script, /_headers/);
  assert.match(script, /_routes\.json/);
  assert.doesNotMatch(script, /generatedDirectories\s*=\s*\[[^\]]*functions/s);
  assert.doesNotMatch(script, /generatedDirectories\s*=\s*\[[^\]]*migrations/s);
  assert.match(read('.gitignore'), /\.dev\.vars\*/);
  assert.match(read('.gitignore'), /\.env\*/);
  assert.match(packageJson.scripts['publish:root'], /pnpm run build/);
  assert.match(read('index.html'), /data-experience="hero"/);
  for (const route of ['archive', 'gallery', 'lilith', 'world']) {
    assert.ok(fs.existsSync(path.join(root, route, 'index.html')), `missing published ${route} route`);
  }
  assert.ok(fs.existsSync(path.join(root, 'login', 'index.html')), 'missing published login route');
  assert.ok(fs.existsSync(path.join(root, '_routes.json')), 'missing Pages Functions route configuration');
  assert.ok(fs.existsSync(path.join(root, 'functions', '_middleware.js')), 'Functions source must remain in the root');
  assert.ok(fs.existsSync(path.join(root, 'migrations', '0001_admin_auth.sql')), 'D1 migration must remain in the root');
});
