import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('..', import.meta.url);

test('site exposes the content-driven build contract', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));

  assert.equal(typeof packageJson.scripts?.dev, 'string');
  assert.equal(typeof packageJson.scripts?.build, 'string');
  assert.equal(typeof packageJson.scripts?.preview, 'string');
  assert.equal(typeof packageJson.scripts?.test, 'string');
  assert.ok(fs.existsSync(new URL('src/', root)));
  assert.ok(fs.existsSync(new URL('content/', root)));
  assert.ok(fs.existsSync(new URL('data/', root)));
  assert.ok(fs.existsSync(new URL('src/pages/archive/', root)));
});
