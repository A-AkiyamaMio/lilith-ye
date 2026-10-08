const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 600_000;
const SESSION_COOKIE = 'lilith_admin_session';

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}

export function normalizeIdentifier(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function derivePasswordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: base64ToBytes(salt),
    iterations: PASSWORD_ITERATIONS,
  }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export async function verifyAdminCredentials(env, identifier, password) {
  const salt = env?.ADMIN_PASSWORD_SALT;
  const expectedHash = env?.ADMIN_PASSWORD_HASH;
  const configured = [env?.ADMIN_USERNAME, env?.ADMIN_EMAIL, salt, expectedHash]
    .every((value) => typeof value === 'string' && value.length > 0);
  if (!configured || typeof password !== 'string') return false;

  const normalized = normalizeIdentifier(identifier);
  const knownIdentifier = normalized === normalizeIdentifier(env.ADMIN_USERNAME)
    || normalized === normalizeIdentifier(env.ADMIN_EMAIL);
  let actualHash;
  try {
    actualHash = await derivePasswordHash(password, salt);
  } catch {
    return false;
  }
  let matchingHash = false;
  try {
    matchingHash = constantTimeEqual(base64ToBytes(actualHash), base64ToBytes(expectedHash));
  } catch {
    return false;
  }
  return knownIdentifier && matchingHash;
}

export function randomSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export async function hashOpaqueValue(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(value)));
  return bytesToHex(new Uint8Array(signature));
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function sessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.max(0, Math.trunc(maxAge))}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function safeArchiveNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/archive/';
  }
  try {
    const parsed = new URL(value, 'https://lilith.invalid');
    if (parsed.origin !== 'https://lilith.invalid') return '/archive/';
    if (parsed.pathname !== '/archive' && !parsed.pathname.startsWith('/archive/')) return '/archive/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/archive/';
  }
}

export function assertSameOrigin(request) {
  const origin = request.headers.get('Origin');
  const expected = new URL(request.url).origin;
  if (!origin || origin === 'null' || origin !== expected) {
    const error = new Error('Request origin is not allowed.');
    error.status = 403;
    throw error;
  }
}

