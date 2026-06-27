import { assertSameOrigin, getCookie, handleError, json } from "../../_lib/http.js";
import { hashSessionToken } from "../../_lib/security.js";
import { SESSION_COOKIE, sessionCookie } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request);
    const token = getCookie(request, SESSION_COOKIE);
    if (token && env.DB) {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashSessionToken(token)).run();
    }
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  } catch (error) {
    return handleError(error);
  }
}
