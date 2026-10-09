import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Cloudflare Pages publishes only dist with isolated auth databases', () => {
  const packageJson = JSON.parse(read('package.json'));
  const config = read('wrangler.toml');
  assert.equal(packageJson.scripts.build, 'astro build');
  assert.equal(packageJson.scripts['publish:root'], undefined);
  assert.match(config, /pages_build_output_dir\s*=\s*["']\.\/dist["']/);
  assert.match(config, /binding\s*=\s*["']AUTH_DB["'][\s\S]*?database_name\s*=\s*["']lilith-ye-auth-preview["']/);
  assert.match(config, /\[\[env\.production\.d1_databases\]\][\s\S]*?binding\s*=\s*["']AUTH_DB["'][\s\S]*?database_name\s*=\s*["']lilith-ye-db["']/);
  const previewId = config.match(/database_id\s*=\s*["']([^"']+)["']/)?.[1];
  const productionId = config.match(/\[\[env\.production\.d1_databases\]\][\s\S]*?database_id\s*=\s*["']([^"']+)["']/)?.[1];
  assert.ok(previewId && productionId && previewId !== productionId, 'Preview and Production must use different D1 databases');
  assert.match(read('.gitignore'), /\.dev\.vars\*/);
  assert.match(read('.gitignore'), /\.env\*/);
  for (const privateRoot of ['README.md', 'wrangler.toml', 'src', 'content', 'functions', 'migrations']) {
    assert.equal(fs.existsSync(path.join(root, 'dist', privateRoot)), false, `dist must not publish repository source: ${privateRoot}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'functions', '_middleware.js')), 'Functions source must remain in the root');
  assert.ok(fs.existsSync(path.join(root, 'migrations', '0001_admin_auth.sql')), 'D1 migration must remain in the root');
});
