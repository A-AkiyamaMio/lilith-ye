import { getCookie, HttpError } from "./http.js";
import { createSessionToken, hashSessionToken } from "./security.js";

export const SESSION_COOKIE = "__Host-lilith_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function createSession(db, userId) {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(tokenHash, userId, expiresAt).run();
  return token;
}

export async function getSession(request, db) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  return db.prepare(`
    SELECT users.id, users.username, users.display_name AS displayName, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.expires_at > datetime('now')
      AND users.status = 'approved'
    LIMIT 1
  `).bind(tokenHash).first();
}

export async function requireAdmin(request, db) {
  const user = await getSession(request, db);
  if (!user || user.role !== "admin") {
    throw new HttpError(403, "admin_required", "只有守夜人可以执行此操作。");
  }
  return user;
}
