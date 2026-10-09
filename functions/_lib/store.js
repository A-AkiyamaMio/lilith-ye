const ATTEMPT_WINDOW_SECONDS = 15 * 60;
const BLOCK_SECONDS = 30 * 60;

export async function createSession(db, record) {
  return db.prepare(`
    INSERT INTO auth_sessions (token_hash, created_at, expires_at, last_seen_at)
    VALUES (?, ?, ?, ?)
  `).bind(record.tokenHash, record.createdAt, record.expiresAt, record.lastSeenAt).run();
}

export async function findSession(db, tokenHash, now) {
  return db.prepare(`
    SELECT token_hash, created_at, expires_at, last_seen_at
    FROM auth_sessions
    WHERE token_hash = ? AND expires_at > ?
    LIMIT 1
  `).bind(tokenHash, now).first();
}

export async function deleteSession(db, tokenHash) {
  return db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function clearExpiredSessions(db, now) {
  return db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(now).run();
}

export async function readAttempt(db, fingerprint, now) {
  const row = await db.prepare(`
    SELECT fingerprint, failures, window_started_at, blocked_until
    FROM auth_attempts
    WHERE fingerprint = ?
    LIMIT 1
  `).bind(fingerprint).first();
  if (!row || now - row.window_started_at >= ATTEMPT_WINDOW_SECONDS) {
    return { failures: 0, blockedUntil: 0 };
  }
  return { failures: row.failures, blockedUntil: row.blocked_until };
}

export async function recordFailure(db, fingerprint, now) {
  const row = await db.prepare(`
    INSERT INTO auth_attempts (fingerprint, failures, window_started_at, blocked_until)
    VALUES (?, 1, ?, 0)
    ON CONFLICT(fingerprint) DO UPDATE SET
      failures = CASE
        WHEN excluded.window_started_at - auth_attempts.window_started_at >= 900 THEN 1
        ELSE auth_attempts.failures + 1
      END,
      window_started_at = CASE
        WHEN excluded.window_started_at - auth_attempts.window_started_at >= 900 THEN excluded.window_started_at
        ELSE auth_attempts.window_started_at
      END,
      blocked_until = CASE
        WHEN excluded.window_started_at - auth_attempts.window_started_at >= 900 THEN 0
        WHEN auth_attempts.failures + 1 >= 5 THEN MAX(auth_attempts.blocked_until, excluded.window_started_at + 1800)
        ELSE auth_attempts.blocked_until
      END
    RETURNING failures, blocked_until
  `).bind(fingerprint, now).first();
  return { failures: row.failures, blockedUntil: row.blocked_until };
}

export async function clearFailures(db, fingerprint) {
  return db.prepare('DELETE FROM auth_attempts WHERE fingerprint = ?').bind(fingerprint).run();
}
