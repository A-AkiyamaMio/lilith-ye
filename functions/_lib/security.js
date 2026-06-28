const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 100_000;

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2 !== 0) return new Uint8Array();
  return Uint8Array.from(hex.match(/.{2}/g), (value) => Number.parseInt(value, 16));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

export function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function validateRegistration(input) {
  const username = normalizeUsername(input.username);
  const password = String(input.password ?? "");
  const displayName = String(input.displayName ?? "").trim() || username;
  const note = String(input.note ?? "").trim();

  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return { ok: false, code: "invalid_username", message: "名字格式不符合要求。" };
  }
  if (password.length < 10 || password.length > 128) {
    return { ok: false, code: "invalid_password", message: "月下誓言需要 10–128 位。" };
  }
  if (displayName.length > 40 || note.length > 500) {
    return { ok: false, code: "invalid_profile", message: "申请内容超过长度限制。" };
  }

  return { ok: true, value: { username, password, displayName, note } };
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256
  );
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, iterationText, saltHex, expectedHex] = String(encoded || "").split("$");
  const iterations = Number(iterationText);
  if (algorithm !== "pbkdf2_sha256" || iterations !== PASSWORD_ITERATIONS) return false;

  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(expectedHex);
  if (!salt.length || !expected.length) return false;

  const actualEncoded = await hashPassword(password, salt);
  const actual = hexToBytes(actualEncoded.split("$")[3]);
  return constantTimeEqual(actual, expected);
}

export function createSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}
