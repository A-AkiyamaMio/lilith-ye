import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSameOrigin,
  derivePasswordHash,
  expiredSessionCookie,
  hashOpaqueValue,
  normalizeIdentifier,
  randomSessionToken,
  readCookie,
  safeArchiveNext,
  sessionCookie,
  verifyAdminCredentials,
} from '../functions/_lib/auth.js';

test('normalizes identifiers without changing password bytes', async () => {
  assert.equal(normalizeIdentifier('  Mio@Example.COM  '), 'mio@example.com');
  const salt = Buffer.alloc(32, 7).toString('base64');
  const passwordHash = await derivePasswordHash(' Pass Word ', salt);
  const env = {
    ADMIN_USERNAME: 'Mio',
    ADMIN_EMAIL: 'mio@example.com',
    ADMIN_PASSWORD_HASH: passwordHash,
    ADMIN_PASSWORD_SALT: salt,
  };

  assert.equal(await verifyAdminCredentials(env, ' MIO ', ' Pass Word '), true);
  assert.equal(await verifyAdminCredentials(env, 'mio@example.com', 'Pass Word'), false);
  assert.equal(await verifyAdminCredentials(env, 'nobody', ' Pass Word '), false);
});

test('derives a 32-byte PBKDF2 SHA-256 value at 600,000 iterations', async () => {
  const salt = Buffer.alloc(32, 11).toString('base64');
  const actual = await derivePasswordHash('correct horse', salt);
  const expectedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: Buffer.alloc(32, 11),
      iterations: 600_000,
    },
    await crypto.subtle.importKey('raw', new TextEncoder().encode('correct horse'), 'PBKDF2', false, ['deriveBits']),
    256,
  );
  assert.equal(Buffer.from(actual, 'base64').byteLength, 32);
  assert.equal(actual, Buffer.from(expectedBits).toString('base64'));
});

test('creates stable HMAC hashes and opaque 32-byte session tokens', async () => {
  const first = await hashOpaqueValue('server-only-secret', 'opaque-value');
  const second = await hashOpaqueValue('server-only-secret', 'opaque-value');
  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  const token = randomSessionToken();
  assert.equal(Buffer.from(token.replaceAll('-', '+').replaceAll('_', '/') + '==', 'base64').byteLength, 32);
  assert.notEqual(token, randomSessionToken());
});

test('reads exact cookies and emits hardened session cookies', () => {
  const request = new Request('https://lilith-ye.vip/archive/', {
    headers: { Cookie: 'other=1; lilith_admin_session=abc%20123; suffix=no' },
  });
  assert.equal(readCookie(request, 'lilith_admin_session'), 'abc 123');
  assert.equal(readCookie(request, 'missing'), null);

  const short = sessionCookie('token-value', 43_200);
  assert.match(short, /^lilith_admin_session=token-value;/);
  assert.match(short, /Max-Age=43200/);
  assert.match(short, /Path=\//);
  assert.match(short, /HttpOnly/);
  assert.match(short, /Secure/);
  assert.match(short, /SameSite=Strict/);
  assert.match(expiredSessionCookie(), /Max-Age=0/);
});

test('allows only same-site archive destinations', () => {
  const allowed = [
    ['/archive', '/archive'],
    ['/archive/', '/archive/'],
    ['/archive/profile/?tab=history#entry', '/archive/profile/?tab=history#entry'],
  ];
  for (const [input, expected] of allowed) assert.equal(safeArchiveNext(input), expected);

  for (const input of [
    undefined,
    '',
    '/',
    '/world/',
    '//evil.example/archive',
    'https://evil.example/archive',
    '/archive\\@evil.example',
    '%2F%2Fevil.example/archive',
    '/archive/%2e%2e/world',
  ]) {
    assert.equal(safeArchiveNext(input), '/archive/');
  }
});

test('rejects missing and cross-site Origin headers', () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://lilith-ye.vip/api/auth/login', {
    method: 'POST',
    headers: { Origin: 'https://lilith-ye.vip' },
  })));
  for (const origin of [null, 'https://evil.example', 'null']) {
    const headers = origin ? { Origin: origin } : {};
    assert.throws(
      () => assertSameOrigin(new Request('https://lilith-ye.vip/api/auth/login', { method: 'POST', headers })),
      (error) => error?.status === 403,
    );
  }
});

