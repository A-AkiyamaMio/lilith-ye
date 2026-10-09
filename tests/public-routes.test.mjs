import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = path.join(root, 'dist');
const publicSourceRoutes = [
  'src/pages/index.astro',
  'src/pages/lilith.astro',
  'src/pages/gallery.astro',
  'src/pages/world.astro'
];
const publicNavigation = 'src/components/SiteNav.astro';
const routes = [
  ['index.html', 'Lilith'],
  ['lilith/index.html', 'Lilith'],
  ['world/index.html', '世界'],
  ['gallery/index.html', '画廊']
];

test('production build contains every public exhibition route', () => {
  for (const [relativePath, titleFragment] of routes) {
    const filePath = path.join(dist, relativePath);
    assert.ok(fs.existsSync(filePath), relativePath);
    const html = fs.readFileSync(filePath, 'utf8');
    assert.match(html, new RegExp(`<title>[^<]*${titleFragment}`));
    assert.doesNotMatch(html, /Supabase 尚未配置|preview=archive|type="password"/i);
  }
});

test('public page sources expose canonical signatures without importing archive data', () => {
  const source = publicSourceRoutes.map((relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')).join('\n');

  assert.match(source, /莉莉丝/);
  assert.match(source, /暗红虹膜内圈/);
  assert.match(source, /五角星吊坠/);
  assert.match(source, /lilithPublicProfile/);
  assert.doesNotMatch(source, /lilithArchiveProfile|提示词全文|content\/private/);
});

test('public navigation does not expose the private archive entry point', () => {
  const source = fs.readFileSync(path.join(root, publicNavigation), 'utf8');
  assert.match(source, /href=[{"']+\/login\/?[}"']+/);
  assert.doesNotMatch(source, /href=["']\/archive["']/);
});

test('public output exposes no private collection content', () => {
  const files = [];
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      if (entry.isFile() && entry.name.endsWith('.html')) files.push(filePath);
    }
  }

  visit(dist);
  assert.ok(files.length >= routes.length);
  for (const filePath of files) {
    const html = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(html, /完整人物档案|私人笔记|未发布章节/);
  }
});
