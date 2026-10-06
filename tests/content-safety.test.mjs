import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const requiredFiles = [
  'content/public/world/index.md',
  'content/public/world/themes.md',
  'content/public/gallery/index.md',
  'content/private/works/index.md',
  'content/private/chapters/index.md',
  'content/private/timeline/index.md',
  'content/private/notes/index.md'
];
const archiveRoutes = [
  'src/pages/archive/index.astro',
  'src/pages/archive/profile.astro',
  'src/pages/archive/appearance.astro',
  'src/pages/archive/assets.astro',
  'src/pages/archive/prompts.astro',
  'src/pages/archive/revisions.astro'
];

test('the first release content files exist in the correct visibility tree', () => {
  for (const relativePath of requiredFiles) {
    assert.ok(fs.existsSync(new URL(relativePath, root)), relativePath);
  }
});

test('published Markdown contains no secrets or unsafe source material', () => {
  const contentRoot = fileURLToPath(new URL('content/', root));
  const forbidden = /未成年|少女|幼年|动物性|性交|生殖器|api[_-]?key|access[_-]?token|密码/i;
  const markdownFiles = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      if (entry.isFile() && entry.name.endsWith('.md')) markdownFiles.push(fullPath);
    }
  }

  visit(contentRoot);
  assert.ok(markdownFiles.length > 0);

  for (const filePath of markdownFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(text, forbidden, path.relative(contentRoot, filePath));
  }
});

test('private archive routes are complete and explicitly non-indexable', () => {
  for (const relativePath of archiveRoutes) {
    assert.ok(fs.existsSync(new URL(relativePath, root)), relativePath);
  }

  const layout = fs.readFileSync(new URL('src/layouts/ArchiveLayout.astro', root), 'utf8');
  assert.match(layout, /noindex,nofollow/);
  assert.doesNotMatch(layout, /提示词全文/);
});

test('private archive media never uses an unprotected public asset path', () => {
  for (const relativePath of archiveRoutes) {
    const source = fs.readFileSync(new URL(relativePath, root), 'utf8');
    assert.doesNotMatch(source, /src=["']\/assets\//, relativePath);
  }
});
