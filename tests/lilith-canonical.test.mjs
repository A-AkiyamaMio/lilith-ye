import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('canonical Lilith profile keeps the approved adult identity and signatures', () => {
  const source = read('src/data/lilith.ts');

  assert.match(source, /adult:\s*true/);
  assert.match(source, /age:\s*19/);
  assert.match(source, /heightCm:\s*169/);
  assert.match(source, /暗红虹膜内圈/);
  assert.match(source, /浅蓝[^\n]*五角星吊坠/);
});

test('canonical public assets are rooted in the public Lilith asset path', () => {
  const source = read('src/data/lilith.ts');
  const assetPaths = [...source.matchAll(/['"](\/assets\/lilith\/[^'"]+)['"]/g)].map((match) => match[1]);

  assert.ok(assetPaths.length >= 2);
  for (const assetPath of assetPaths) {
    assert.match(assetPath, /^\/assets\/lilith\//);
    assert.ok(fs.existsSync(path.join(root, 'public', assetPath.slice(1))), assetPath);
  }
});
