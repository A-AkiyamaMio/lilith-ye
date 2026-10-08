import { hashOpaqueValue, readCookie, safeArchiveNext } from './_lib/auth.js';
import { findSession } from './_lib/store.js';

const ARCHIVE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
};

function archiveResponse(body, status, extraHeaders = {}) {
  return new Response(body, { status, headers: { ...ARCHIVE_HEADERS, ...extraHeaders } });
}

function loginRedirect(request) {
  const url = new URL(request.url);
  const next = safeArchiveNext(`${url.pathname}${url.search}`);
  return archiveResponse(null, 302, { Location: `/login/?next=${encodeURIComponent(next)}` });
}

function withArchiveHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(ARCHIVE_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (path !== '/archive' && !path.startsWith('/archive/')) return context.next();

  const { env, request } = context;
  if (!env?.AUTH_DB || !env?.SESSION_SECRET) {
    return archiveResponse('Private archive is temporarily unavailable.', 503);
  }
  const token = readCookie(request, 'lilith_admin_session');
  if (!token) return loginRedirect(request);

  try {
    const tokenHash = await hashOpaqueValue(env.SESSION_SECRET, token);
    const session = await findSession(env.AUTH_DB, tokenHash, Math.floor(Date.now() / 1000));
    if (!session) return loginRedirect(request);
    return withArchiveHeaders(await context.next());
  } catch {
    return archiveResponse('Private archive is temporarily unavailable.', 503);
  }
}

