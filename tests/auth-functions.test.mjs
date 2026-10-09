import assert from 'node:assert/strict';
import test from 'node:test';

import { derivePasswordHash, hashOpaqueValue } from '../functions/_lib/auth.js';
import { onRequestPost as login } from '../functions/api/auth/login.js';
import { onRequestGet as session } from '../functions/api/auth/session.js';
import { onRequestPost as logout } from '../functions/api/auth/logout.js';

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  run() { return this.db.execute(this.sql, this.args); }
  first() { return this.db.execute(this.sql, this.args); }
}

class FakeD1 {
  constructor() { this.sessions = new Map(); this.attempts = new Map(); }
  prepare(sql) { return new Statement(this, sql); }
  execute(sql, args) {
    if (sql.includes('INSERT INTO auth_sessions')) {
      this.sessions.set(args[0], { token_hash: args[0], created_at: args[1], expires_at: args[2], last_seen_at: args[3] });
      return { success: true };
    }
    if (sql.startsWith('DELETE FROM auth_sessions WHERE token_hash')) { this.sessions.delete(args[0]); return { success: true }; }
    if (sql.startsWith('DELETE FROM auth_sessions WHERE expires_at')) return { success: true };
    if (sql.includes('FROM auth_sessions')) {
      const row = this.sessions.get(args[0]); return row && row.expires_at > args[1] ? row : null;
    }
    if (sql.includes('INSERT INTO auth_attempts')) {
      const [fingerprint, now] = args;
      const old = this.attempts.get(fingerprint);
      const reset = !old || now - old.window_started_at >= 900;
      const failures = reset ? 1 : old.failures + 1;
      const blocked_until = !reset && failures >= 5 ? Math.max(old.blocked_until, now + 1800) : 0;
      this.attempts.set(fingerprint, { fingerprint, failures, window_started_at: reset ? now : old.window_started_at, blocked_until });
      return { failures, blocked_until };
    }
    if (sql.startsWith('DELETE FROM auth_attempts')) { this.attempts.delete(args[0]); return { success: true }; }
    if (sql.includes('FROM auth_attempts')) return this.attempts.get(args[0]) ?? null;
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

async function fixture() {
  const salt = Buffer.alloc(32, 19).toString('base64');
  return {
    env: {
      AUTH_DB: new FakeD1(),
      ADMIN_USERNAME: 'mio',
      ADMIN_EMAIL: 'mio@example.test',
      ADMIN_PASSWORD_SALT: salt,
      ADMIN_PASSWORD_HASH: await derivePasswordHash('Exact Password ', salt),
      SESSION_SECRET: 'test-session-secret-that-is-long-enough',
    },
  };
}

function request(body, options = {}) {
  const headers = new Headers({
    Origin: 'https://lilith-ye.vip',
    'Content-Type': 'application/json',
    'CF-Connecting-IP': '203.0.113.7',
    ...options.headers,
  });
  return new Request('https://lilith-ye.vip/api/auth/login', {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('username and email login normalize identifiers, set secure durations, and create only hashed sessions', async () => {
  for (const [identifier, remember, maxAge] of [[' MIO ', false, 43_200], [' MIO@EXAMPLE.TEST ', true, 2_592_000]]) {
    const { env } = await fixture();
    const response = await login({ request: request({ identifier, password: 'Exact Password ', remember }), env });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, next: '/archive/' });
    assert.match(response.headers.get('Set-Cookie'), new RegExp(`Max-Age=${maxAge}`));
    assert.match(response.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
    assert.equal(env.AUTH_DB.sessions.size, 1);
    const [storedHash] = env.AUTH_DB.sessions.keys();
    assert.match(storedHash, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(storedHash, /Exact|mio/i);
  }
});

test('invalid identifiers and passwords share one response and rate-limit on attempt five', async () => {
  const { env } = await fixture();
  const unknown = await login({ request: request({ identifier: 'unknown', password: 'wrong' }), env });
  const wrongPassword = await login({ request: request({ identifier: 'mio', password: 'wrong' }), env });
  assert.equal((await unknown.json()).message, (await wrongPassword.json()).message);

  const limited = await fixture();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await login({ request: request({ identifier: 'mio', password: 'wrong' }), env: limited.env });
    const payload = await response.json();
    assert.equal(typeof payload.message, 'string');
    assert.equal(response.status, attempt === 5 ? 429 : 401);
    if (attempt === 5) assert.ok(Number(response.headers.get('Retry-After')) > 0);
  }
});

test('rejects malformed, oversized, overlong, non-string, and cross-origin requests safely', async () => {
  const { env } = await fixture();
  const cases = [
    [request('{'), 400],
    [request({ identifier: 42, password: 'x' }), 400],
    [request({ identifier: 'x'.repeat(255), password: 'x' }), 400],
    [request({ identifier: 'x', password: 'x'.repeat(257) }), 400],
    [request(' '.repeat(8_193)), 413],
    [request({ identifier: 'mio', password: 'x' }, { headers: { Origin: 'https://evil.example' } }), 403],
  ];
  for (const [input, status] of cases) {
    const response = await login({ request: input, env });
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /SyntaxError|ADMIN_|Exact Password|stack/i);
  }
});

test('cancels an oversized streaming body before waiting for its remaining chunks', async () => {
  const { env } = await fixture();
  let cancelled = false;
  let controller;
  const body = new ReadableStream({
    start(streamController) {
      controller = streamController;
      streamController.enqueue(new Uint8Array(8_193));
    },
    pull() { return new Promise(() => {}); },
    cancel() { cancelled = true; },
  });
  const input = new Request('https://lilith-ye.vip/api/auth/login', {
    method: 'POST',
    headers: { Origin: 'https://lilith-ye.vip', 'Content-Type': 'application/json' },
    body,
    duplex: 'half',
  });
  const pending = login({ request: input, env });
  const timeout = Symbol('timeout');
  const response = await Promise.race([pending, new Promise((resolve) => setTimeout(() => resolve(timeout), 100))]);
  if (response === timeout) {
    controller.error(new Error('test cleanup'));
    await pending;
  }
  assert.equal(response?.status, 413, 'oversized stream should be rejected immediately');
  assert.equal(cancelled, true, 'remaining chunks should not be read');
});

test('returns 503 when runtime configuration is absent', async () => {
  const response = await login({ request: request({ identifier: 'mio', password: 'x' }), env: {} });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /AUTH_DB|ADMIN_/);
});

test('session reports a fixed label and logout invalidates the token', async () => {
  const { env } = await fixture();
  const loginResponse = await login({ request: request({ identifier: 'mio', password: 'Exact Password ' }), env });
  const cookie = loginResponse.headers.get('Set-Cookie').split(';')[0];
  const sessionRequest = new Request('https://lilith-ye.vip/api/auth/session', { headers: { Cookie: cookie } });
  const active = await session({ request: sessionRequest, env });
  assert.deepEqual(await active.json(), { authenticated: true, administrator: { label: 'Mio' } });

  const logoutRequest = new Request('https://lilith-ye.vip/api/auth/logout', {
    method: 'POST', headers: { Cookie: cookie, Origin: 'https://lilith-ye.vip' },
  });
  const ended = await logout({ request: logoutRequest, env });
  assert.equal(ended.status, 200);
  assert.match(ended.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.deepEqual(await (await session({ request: sessionRequest, env })).json(), { authenticated: false });
  assert.equal(env.AUTH_DB.sessions.size, 0);
});
