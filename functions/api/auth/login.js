import { assertSameOrigin, handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { normalizeUsername, verifyPassword } from "../../_lib/security.js";
import { createSession, sessionCookie } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) throw new HttpError(503, "database_unavailable", "身份服务尚未配置。 ");
    assertSameOrigin(request);
    const input = await readJson(request);
    const username = normalizeUsername(input.username);
    const password = String(input.password ?? "");
    const user = await env.DB.prepare(`
      SELECT id, username, display_name AS displayName, password_hash AS passwordHash, role, status
      FROM users WHERE username = ? LIMIT 1
    `).bind(username).first();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "invalid_credentials", "名字或月下誓言不正确。 ");
    }
    if (user.status === "pending") {
      throw new HttpError(403, "approval_pending", "申请仍在等待守夜人的审批。 ");
    }
    if (user.status !== "approved") {
      throw new HttpError(403, "access_denied", "这个名字目前无法进入收藏馆。 ");
    }

    const token = await createSession(env.DB, user.id);
    return json(
      { ok: true, user: { username: user.username, displayName: user.displayName, role: user.role }, redirect: "/archive/" },
      200,
      { "set-cookie": sessionCookie(token) }
    );
  } catch (error) {
    return handleError(error);
  }
}
