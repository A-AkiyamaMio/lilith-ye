import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), 'utf8');
}

test('content schema separates public and private collections', () => {
  const schema = read('src/content.config.ts');
  const loader = read('src/lib/content.ts');

  assert.match(schema, /public/);
  assert.match(schema, /private/);
  assert.match(loader, /export async function getPublicEntries/);
  assert.match(loader, /export async function getPrivateEntries/);
  assert.match(loader, /public/);
  assert.match(loader, /private/);
});

test('public data contract contains no archive paths', () => {
  const navigation = read('data/navigation.json');
  const gallery = read('data/gallery.json');

  assert.doesNotMatch(navigation, /archive/);
  assert.doesNotMatch(gallery, /archive/);
});
