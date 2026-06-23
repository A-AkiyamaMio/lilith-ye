export const demoAccounts = Object.freeze([
  { username: "visitor", password: "lilith", role: "visitor", displayName: "Night Visitor" },
  { username: "admin", password: "moonrose", role: "admin", displayName: "Lilith Keeper" }
]);

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function authenticate(accounts, username, password) {
  const normalized = normalizeUsername(username);
  const account = accounts.find((item) => normalizeUsername(item.username) === normalized);

  if (!account || account.password !== String(password || "")) {
    return { ok: false, reason: "invalid_credentials" };
  }

  return {
    ok: true,
    user: {
      username: account.username,
      role: account.role,
      displayName: account.displayName
    }
  };
}

export function getLandingPath(user) {
  if (!user) return "#login";
  return user.role === "admin" ? "#admin-vault" : "#night-archive";
}
