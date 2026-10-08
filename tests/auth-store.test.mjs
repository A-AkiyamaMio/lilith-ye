import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  clearExpiredSessions,
  clearFailures,
  createSession,
  deleteSession,
  findSession,
  readAttempt,
  recordFailure,
} from '../functions/_lib/store.js';

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async run() { return this.db.execute(this.sql, this.args, 'run'); }
  async first() { return this.db.execute(this.sql, this.args, 'first'); }
}

class FakeD1 {
  constructor() { this.sessions = new Map(); this.attempts = new Map(); this.calls = []; }
  prepare(sql) { return new FakeStatement(this, sql); }
  execute(sql, args, mode) {
    this.calls.push({ sql, args, mode });
    if (sql.includes('INSERT INTO auth_sessions')) {
      const [tokenHash, createdAt, expiresAt, lastSeenAt] = args;
      this.sessions.set(tokenHash, { token_hash: tokenHash, created_at: createdAt, expires_at: expiresAt, last_seen_at: lastSeenAt });
      return { success: true };
    }
    if (sql.startsWith('DELETE FROM auth_sessions WHERE token_hash')) {
      this.sessions.delete(args[0]); return { success: true };
    }
    if (sql.startsWith('DELETE FROM auth_sessions WHERE expires_at')) {
      for (const [key, row] of this.sessions) if (row.expires_at <= args[0]) this.sessions.delete(key);
      return { success: true };
    }
    if (sql.includes('FROM auth_sessions')) {
      const row = this.sessions.get(args[0]);
      return row && row.expires_at > args[1] ? row : null;
    }
    if (sql.includes('INSERT INTO auth_attempts')) {
      const [fingerprint, now] = args;
      const old = this.attempts.get(fingerprint);
      const reset = !old || now - old.window_started_at >= 900;
      const failures = reset ? 1 : old.failures + 1;
      const blockedUntil = !reset && failures >= 5 ? Math.max(old.blocked_until, now + 1800) : 0;
      const row = { fingerprint, failures, window_started_at: reset ? now : old.window_started_at, blocked_until: blockedUntil };
      this.attempts.set(fingerprint, row);
      return { failures, blocked_until: blockedUntil };
    }
    if (sql.startsWith('DELETE FROM auth_attempts')) { this.attempts.delete(args[0]); return { success: true }; }
    if (sql.includes('FROM auth_attempts')) return this.attempts.get(args[0]) ?? null;
    throw new Error(`Unexpected SQL: ${sql}`);
  }
}

test('migration creates keyed session and attempt tables with cleanup indexes', async () => {
  const sql = await readFile(new URL('../migrations/0001_admin_auth.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS auth_sessions/i);
  assert.match(sql, /token_hash\s+TEXT\s+PRIMARY KEY/i);
  assert.match(sql, /CREATE INDEX[^;]+expires_at/is);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS auth_attempts/i);
  assert.match(sql, /fingerprint\s+TEXT\s+PRIMARY KEY/i);
  assert.match(sql, /CREATE INDEX[^;]+blocked_until/is);
});

test('session records reject expiry and support deletion and cleanup', async () => {
  const db = new FakeD1();
  await createSession(db, { tokenHash: 'a', createdAt: 100, expiresAt: 200, lastSeenAt: 100 });
  assert.equal((await findSession(db, 'a', 150)).token_hash, 'a');
  assert.equal(await findSession(db, 'a', 200), null);
  await createSession(db, { tokenHash: 'b', createdAt: 100, expiresAt: 400, lastSeenAt: 100 });
  await clearExpiredSessions(db, 250);
  assert.equal(db.sessions.has('a'), false);
  assert.equal(db.sessions.has('b'), true);
  await deleteSession(db, 'b');
  assert.equal(db.sessions.size, 0);
  assert.deepEqual(db.calls[0].args, ['a', 100, 200, 100]);
});

test('failure counting is atomic, blocks at five, resets after 15 minutes, and clears', async () => {
  const db = new FakeD1();
  const fingerprint = 'fingerprint';
  const firstTwo = await Promise.all([
    recordFailure(db, fingerprint, 1_000),
    recordFailure(db, fingerprint, 1_001),
  ]);
  assert.deepEqual(firstTwo.map((row) => row.failures), [1, 2]);
  await recordFailure(db, fingerprint, 1_002);
  await recordFailure(db, fingerprint, 1_003);
  const fifth = await recordFailure(db, fingerprint, 1_004);
  assert.deepEqual(fifth, { failures: 5, blockedUntil: 2_804 });
  assert.deepEqual(await readAttempt(db, fingerprint, 1_005), { failures: 5, blockedUntil: 2_804 });
  const reset = await recordFailure(db, fingerprint, 1_901);
  assert.deepEqual(reset, { failures: 1, blockedUntil: 0 });
  await clearFailures(db, fingerprint);
  assert.deepEqual(await readAttempt(db, fingerprint, 1_902), { failures: 0, blockedUntil: 0 });
  const upsert = db.calls.find((call) => call.sql.includes('INSERT INTO auth_attempts'));
  assert.match(upsert.sql, /ON CONFLICT\s*\(fingerprint\)\s*DO UPDATE/i);
  assert.match(upsert.sql, /RETURNING\s+failures\s*,\s*blocked_until/i);
});
