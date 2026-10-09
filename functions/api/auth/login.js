import {
  assertSameOrigin,
  administratorAttemptIdentifier,
  hasAdminAuthConfig,
  hashOpaqueValue,
  randomSessionToken,
  safeArchiveNext,
  sessionCookie,
  verifyAdminCredentials,
} from '../../_lib/auth.js';
import { cleanupAuthRecords, clearFailures, createSession, readAttempt, recordFailure } from '../../_lib/store.js';

const MAX_BODY_BYTES = 8 * 1024;
const DEFAULT_SESSION_SECONDS = 12 * 60 * 60;
const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;

function json(payload, status, headers = {}) {
  return Response.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

async function readJsonBody(request) {
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    const error = new Error('Payload too large'); error.status = 413; throw error;
  }
  const type = request.headers.get('Content-Type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    const error = new Error('JSON required'); error.status = 400; throw error;
  }
  const reader = request.body?.getReader();
  if (!reader) { const error = new Error('Invalid body'); error.status = 400; throw error; }
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        try { await reader.cancel(); } catch { /* Preserve the intended 413 response. */ }
        const error = new Error('Payload too large'); error.status = 413; throw error;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { const error = new Error('Invalid encoding'); error.status = 400; throw error; }
  let value;
  try { value = JSON.parse(text); } catch { const error = new Error('Invalid JSON'); error.status = 400; throw error; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Invalid body'); error.status = 400; throw error;
  }
  return value;
}

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request);
  } catch {
    return json({ ok: false, message: '无法确认请求来源，请刷新后重试。' }, 403);
  }
  if (!hasAdminAuthConfig(env)) return json({ ok: false, message: '登录服务暂时不可用。' }, 503);

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const status = error?.status === 413 ? 413 : 400;
    return json({ ok: false, message: status === 413 ? '提交内容过长。' : '请检查填写内容。' }, status);
  }

  const { identifier, password } = body;
  if (typeof identifier !== 'string'
    || typeof password !== 'string'
    || (body.remember !== undefined && typeof body.remember !== 'boolean')
    || identifier.length > 254
    || password.length > 256) {
    return json({ ok: false, message: '请检查填写内容。' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const source = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const fingerprint = await hashOpaqueValue(env.SESSION_SECRET, `${administratorAttemptIdentifier(env, identifier)}\n${source}`);
  try {
    await cleanupAuthRecords(env.AUTH_DB, now);
    const attempt = await readAttempt(env.AUTH_DB, fingerprint, now);
    if (attempt.blockedUntil > now) {
      const retryAfter = attempt.blockedUntil - now;
      return json({ ok: false, message: '尝试次数太多，请稍后再试。', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
    }

    const valid = await verifyAdminCredentials(env, identifier, password);
    if (!valid) {
      const failure = await recordFailure(env.AUTH_DB, fingerprint, now);
      if (failure.blockedUntil > now) {
        const retryAfter = failure.blockedUntil - now;
        return json({ ok: false, message: '尝试次数太多，请稍后再试。', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
      }
      return json({ ok: false, message: '账号或密码不正确。' }, 401);
    }

    const maxAge = body.remember ? REMEMBERED_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
    const token = randomSessionToken();
    const tokenHash = await hashOpaqueValue(env.SESSION_SECRET, token);
    await createSession(env.AUTH_DB, {
      tokenHash,
      createdAt: now,
      expiresAt: now + maxAge,
      lastSeenAt: now,
    });
    await clearFailures(env.AUTH_DB, fingerprint);
    return json(
      { ok: true, next: safeArchiveNext(body.next) },
      200,
      { 'Set-Cookie': sessionCookie(token, maxAge) },
    );
  } catch {
    return json({ ok: false, message: '登录服务暂时不可用。' }, 503);
  }
}
