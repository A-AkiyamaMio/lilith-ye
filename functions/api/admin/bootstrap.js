import { assertSameOrigin, handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { hashPassword, validateRegistration } from "../../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB || !env.ADMIN_BOOTSTRAP_TOKEN) {
      throw new HttpError(404, "not_found", "未找到。 ");
    }
    assertSameOrigin(request);
    const authorization = request.headers.get("authorization") || "";
    if (authorization !== `Bearer ${env.ADMIN_BOOTSTRAP_TOKEN}`) {
      throw new HttpError(403, "bootstrap_rejected", "初始化凭据无效。 ");
    }

    const existingAdmin = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").first();
    if (existingAdmin) throw new HttpError(409, "admin_exists", "守夜人账号已经存在。 ");

    const input = await readJson(request);
    const validation = validateRegistration(input);
    if (!validation.ok) throw new HttpError(400, validation.code, validation.message);
    const { username, password, displayName } = validation.value;
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(`
      INSERT INTO users (username, display_name, password_hash, role, status, reviewed_at)
      VALUES (?, ?, ?, 'admin', 'approved', datetime('now'))
    `).bind(username, displayName, passwordHash).run();

    return json({ ok: true, message: "首位守夜人账号已经建立。请立即移除 ADMIN_BOOTSTRAP_TOKEN。" }, 201);
  } catch (error) {
    return handleError(error);
  }
}
