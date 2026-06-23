import assert from "node:assert/strict";
import { authenticate, demoAccounts, getLandingPath, normalizeUsername } from "../scripts/auth-model.js";

assert.equal(normalizeUsername("  Admin "), "admin");

assert.deepEqual(authenticate(demoAccounts, "VISITOR", "lilith"), {
  ok: true,
  user: {
    username: "visitor",
    role: "visitor",
    displayName: "Night Visitor"
  }
});

assert.deepEqual(authenticate(demoAccounts, "visitor", "wrong"), {
  ok: false,
  reason: "invalid_credentials"
});

assert.equal(getLandingPath({ role: "admin" }), "#admin-vault");
assert.equal(getLandingPath({ role: "visitor" }), "#night-archive");

console.log("auth-model tests passed");
