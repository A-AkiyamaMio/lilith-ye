import { assertSameOrigin, expiredSessionCookie, hasAdminAuthConfig, hashOpaqueValue, readCookie } from '../../_lib/auth.js';
import { cleanupAuthRecords, deleteSession } from '../../_lib/store.js';

function json(payload, status, cookie = false) {
  const headers = { 'Cache-Control': 'no-store' };
  if (cookie) headers['Set-Cookie'] = expiredSessionCookie();
  return Response.json(payload, { status, headers });
}

export async function onRequestPost({ request, env }) {
  try { assertSameOrigin(request); } catch { return json({ ok: false }, 403); }
  const token = readCookie(request, 'lilith_admin_session');
  if (token) {
    if (!hasAdminAuthConfig(env)) return json({ ok: false }, 503);
    try {
      await cleanupAuthRecords(env.AUTH_DB, Math.floor(Date.now() / 1000));
      const tokenHash = await hashOpaqueValue(env.SESSION_SECRET, token);
      await deleteSession(env.AUTH_DB, tokenHash);
    } catch {
      return json({ ok: false }, 503);
    }
  }
  return json({ ok: true }, 200, true);
}
