import { hasAdminAuthConfig, hashOpaqueValue, readCookie } from '../../_lib/auth.js';
import { cleanupAuthRecords, findSession } from '../../_lib/store.js';

function json(payload, status = 200) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestGet({ request, env }) {
  if (!hasAdminAuthConfig(env)) return json({ authenticated: false }, 503);
  const token = readCookie(request, 'lilith_admin_session');
  if (!token) return json({ authenticated: false });
  try {
    await cleanupAuthRecords(env.AUTH_DB, Math.floor(Date.now() / 1000));
    const tokenHash = await hashOpaqueValue(env.SESSION_SECRET, token);
    const row = await findSession(env.AUTH_DB, tokenHash, Math.floor(Date.now() / 1000));
    return row
      ? json({ authenticated: true, administrator: { label: 'Mio' } })
      : json({ authenticated: false });
  } catch {
    return json({ authenticated: false }, 503);
  }
}
