// ── Super Admin ─────────────────────────────────────────────
const ADMIN = Object.freeze({
  username: "lilith",
  password: "Lilith_4ever",
  role: "admin",
  displayName: "Lilith Keeper"
});

// ── Demo visitors ───────────────────────────────────────────
export const demoAccounts = Object.freeze([
  { username: "visitor", password: "lilith", role: "visitor", displayName: "Night Visitor" }
]);

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function authenticate(accounts, username, password) {
  const normalized = normalizeUsername(username);
  const pw = String(password || "");

  // Check super admin first
  if (normalizeUsername(ADMIN.username) === normalized && ADMIN.password === pw) {
    return {
      ok: true,
      user: { username: ADMIN.username, role: ADMIN.role, displayName: ADMIN.displayName }
    };
  }

  // Check demo accounts
  const account = accounts.find((item) => normalizeUsername(item.username) === normalized);
  if (account && account.password === pw) {
    return {
      ok: true,
      user: { username: account.username, role: account.role, displayName: account.displayName }
    };
  }

  // Check registered users (localStorage)
  const registered = loadRegisteredUsers();
  const regUser = registered.find((u) => normalizeUsername(u.username) === normalized);
  if (regUser && regUser.password === pw) {
    return {
      ok: true,
      user: { username: regUser.username, role: "visitor", displayName: regUser.displayName }
    };
  }

  return { ok: false, reason: "invalid_credentials" };
}

export function getLandingPath(user) {
  if (!user) return "#login";
  return user.role === "admin" ? "#admin-vault" : "#night-archive";
}

// ── Registration (localStorage) ────────────────────────────

const STORAGE_KEY = "lilith_registered_users";

export function loadRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function registerUser(username, password, displayName) {
  const normalized = normalizeUsername(username);

  // Check against admin
  if (normalizeUsername(ADMIN.username) === normalized) {
    return { ok: false, reason: "That name belongs to the night itself." };
  }

  // Check against demo accounts
  if (demoAccounts.some((a) => normalizeUsername(a.username) === normalized)) {
    return { ok: false, reason: "Covenant names cannot be duplicated." };
  }

  // Check against registered users
  const existing = loadRegisteredUsers();
  if (existing.some((u) => normalizeUsername(u.username) === normalized)) {
    return { ok: false, reason: "A whisper by that name has already been marked." };
  }

  const display = displayName || username;
  existing.push({ username, password, displayName: display });
  saveRegisteredUsers(existing);
  return { ok: true, user: { username, role: "visitor", displayName: display } };
}
