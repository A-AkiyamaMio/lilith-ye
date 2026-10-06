import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), 'utf8');
}

test('visual foundation exposes the approved gallery tokens', () => {
  const tokens = read('src/styles/tokens.css');
  assert.match(tokens, /--paper/);
  assert.match(tokens, /--ink/);
  assert.match(tokens, /--wine/);
  assert.match(tokens, /--ice/);
  assert.match(tokens, /--content-max/);
});

test('motion foundation includes a reduced-motion path', () => {
  const globalStyles = read('src/styles/global.css');
  const motion = read('src/lib/motion.ts');
  assert.match(globalStyles, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /export function initMotion/);
  assert.match(motion, /data-motion-ready/);
  assert.match(motion, /matchMedia/);
});

test('motion components are present and do not require audio', () => {
  const reveal = read('src/components/Reveal.astro');
  const ambient = read('src/components/AmbientField.astro');
  const transition = read('src/components/PageTransition.astro');

  assert.match(reveal, /data-reveal/);
  assert.match(ambient, /ambient/);
  assert.match(transition, /transition/);
  assert.doesNotMatch(reveal + ambient + transition, /audio|autoplay/i);
});
