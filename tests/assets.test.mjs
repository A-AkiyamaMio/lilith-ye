import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('gallery metadata points only to optimized public assets', () => {
  const gallery = JSON.parse(fs.readFileSync(path.join(root, 'data/gallery.json'), 'utf8'));
  for (const item of gallery) {
    assert.match(item.src, /^\/assets\/(?:gallery\/gallery-\d+\.webp|lilith\/(?:hero\.webp|portrait-reference\.jpg|pendant-reference\.jpg))$/);
    assert.ok(fs.existsSync(path.join(root, 'public', item.src.slice(1))), item.src);
    assert.ok(item.alt.length > 0);
  }
});

test('character and texture assets are optimized and source files are not shipped', () => {
  const expected = [
    'public/assets/lilith/hero.webp',
    'public/assets/lilith/portrait.webp',
    'public/assets/textures/grain.webp',
    'public/assets/textures/veil.webp'
  ];

  for (const relativePath of expected) {
    const filePath = path.join(root, relativePath);
    assert.ok(fs.existsSync(filePath), relativePath);
    assert.ok(fs.statSync(filePath).size < 700_000, relativePath);
  }

  const sourceFiles = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      if (entry.isFile() && entry.name.includes('-source.')) sourceFiles.push(filePath);
    }
  }

  visit(path.join(root, 'public/assets'));
  assert.deepEqual(sourceFiles, []);
});
