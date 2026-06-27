import assert from "node:assert/strict";
import { normalizeUsername, validateAccessInput } from "../scripts/auth-model.js";
import { hashPassword, verifyPassword } from "../functions/_lib/security.js";

assert.equal(normalizeUsername("  Night.Guest "), "night.guest");

assert.equal(validateAccessInput("apply", {
  username: "guest_13",
  password: "a-long-private-vow",
  displayName: "Night Guest",
  note: "For the archive"
}).ok, true);

const invalid = validateAccessInput("apply", { username: "x", password: "short" });
assert.equal(invalid.ok, false);
assert.ok(invalid.errors.username);
assert.ok(invalid.errors.password);

const encoded = await hashPassword("moonlit-covenant");
assert.match(encoded, /^pbkdf2_sha256\$210000\$/);
assert.equal(await verifyPassword("moonlit-covenant", encoded), true);
assert.equal(await verifyPassword("wrong-vow", encoded), false);

console.log("auth model tests passed");
