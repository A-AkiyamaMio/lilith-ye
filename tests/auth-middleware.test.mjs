import assert from 'node:assert/strict';
import test from 'node:test';

import { hashOpaqueValue } from '../functions/_lib/auth.js';
import { onRequest } from '../functions/_middleware.js';

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  first() {
    if (this.db.throwOnRead) throw new Error('database unavailable');
    const row = this.db.sessions.get(this.args[0]);
    return row && row.expires_at > this.args[1] ? row : null;
  }
}

class FakeD1 {
  constructor() { this.sessions = new Map(); this.throwOnRead = false; }
  prepare(sql) { return new Statement(this, sql); }
}

function context({ path = '/archive/profile/?tab=history', cookie, env, next } = {}) {
  const headers = cookie ? { Cookie: `lilith_admin_session=${cookie}` } : {};
  return {
    request: new Request(`https://lilith-ye.vip${path}`, { headers }),
    env,
    next: next ?? (() => new Response('private', { status: 200 })),
  };
}

test('anonymous archive requests redirect to a same-origin login destination', async () => {
  const response = await onRequest(context({ env: { AUTH_DB: new FakeD1(), SESSION_SECRET: 'secret' } }));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/login/?next=%2Farchive%2Fprofile%2F%3Ftab%3Dhistory');
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
});

test('only a current known session reaches the static archive handler', async () => {
  const db = new FakeD1();
  const env = { AUTH_DB: db, SESSION_SECRET: 'secret' };
  const token = 'valid-token';
  const hash = await hashOpaqueValue(env.SESSION_SECRET, token);
  db.sessions.set(hash, { token_hash: hash, expires_at: Math.floor(Date.now() / 1000) + 300 });
  let calls = 0;
  const response = await onRequest(context({ cookie: token, env, next: () => { calls += 1; return new Response('private'); } }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'private');
  assert.equal(calls, 1);
  assert.match(response.headers.get('X-Robots-Tag'), /noarchive/);
});

test('malformed, unknown, and expired sessions never reach archive content', async () => {
  const db = new FakeD1();
  const env = { AUTH_DB: db, SESSION_SECRET: 'secret' };
  const expired = await hashOpaqueValue(env.SESSION_SECRET, 'expired');
  db.sessions.set(expired, { token_hash: expired, expires_at: 1 });
  for (const cookie of ['%', 'unknown', 'expired']) {
    let called = false;
    const response = await onRequest(context({ cookie, env, next: () => { called = true; return new Response('leak'); } }));
    assert.equal(response.status, 302);
    assert.equal(called, false);
  }
});

test('missing runtime bindings and D1 errors fail closed', async () => {
  for (const env of [{}, { AUTH_DB: new FakeD1() }, { SESSION_SECRET: 'secret' }]) {
    let called = false;
    const response = await onRequest(context({ cookie: 'token', env, next: () => { called = true; return new Response('leak'); } }));
    assert.equal(response.status, 503);
    assert.equal(called, false);
  }
  const db = new FakeD1(); db.throwOnRead = true;
  let called = false;
  const response = await onRequest(context({ cookie: 'token', env: { AUTH_DB: db, SESSION_SECRET: 'secret' }, next: () => { called = true; return new Response('leak'); } }));
  assert.equal(response.status, 503);
  assert.equal(called, false);
});
