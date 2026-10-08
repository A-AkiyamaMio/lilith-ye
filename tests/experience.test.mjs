import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('public layout loads the immersive motion shell', () => {
  const layout = read('src/layouts/PublicLayout.astro');
  assert.match(layout, /CursorAura/);
  assert.match(layout, /data-page-root/);
  assert.match(layout, /theme-color" content="#050407"/);
});

test('visual foundation exposes the dark exhibition contract', () => {
  const tokens = read('src/styles/tokens.css');
  const styles = `${read('src/styles/global.css')}\n${read('src/styles/framework.css')}`;
  assert.match(tokens, /--void:/);
  assert.match(tokens, /--ice-glow:/);
  assert.match(tokens, /--blood:/);
  assert.match(styles, /\.cursor-aura/);
  assert.match(styles, /\.kinetic-title/);
  assert.match(styles, /\.spotlight-card/);
  assert.match(styles, /@media \(pointer: fine\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('motion runtime supports pointer aura and tilt without hiding content', () => {
  const motion = read('src/lib/motion.ts');
  assert.match(motion, /pointermove/);
  assert.match(motion, /\[data-tilt\]/);
  assert.match(motion, /--pointer-x/);
  assert.match(motion, /IntersectionObserver/);
  assert.match(motion, /data-reveal.*visible/s);
});
