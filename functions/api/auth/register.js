import { assertSameOrigin, handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { hashPassword, validateRegistration } from "../../_lib/security.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) throw new HttpError(503, "database_unavailable", "身份服务尚未配置。 ");
    assertSameOrigin(request);
    const input = await readJson(request);
    const validation = validateRegistration(input);
    if (!validation.ok) throw new HttpError(400, validation.code, validation.message);

    const { username, password, displayName, note } = validation.value;
    const existing = await env.DB.prepare("SELECT status FROM users WHERE username = ? LIMIT 1").bind(username).first();
    if (existing) {
      const message = existing.status === "pending" ? "这个名字的申请仍在等待审批。" : "这个名字已经被夜色记住。";
      throw new HttpError(409, "username_unavailable", message);
    }

    const passwordHash = await hashPassword(password);
    await env.DB.prepare(`
      INSERT INTO users (username, display_name, password_hash, application_note, role, status)
      VALUES (?, ?, ?, ?, 'visitor', 'pending')
    `).bind(username, displayName, passwordHash, note).run();

    return json({ ok: true, status: "pending", message: "申请已经封入信函，请等待守夜人的审批。" }, 201);
  } catch (error) {
    // Preview-only diagnostics. Remove after the Cloudflare runtime issue is
    // identified; production and the custom domain keep the generic response.
    if (new URL(request.url).hostname.endsWith(".pages.dev") && !(error instanceof HttpError)) {
      console.error(error);
      return json({
        ok: false,
        code: "internal_error",
        message: "夜之门暂时无法回应。",
        diagnostic: error instanceof Error ? `${error.name}: ${error.message}` : "Unknown runtime error"
      }, 500);
    }
    return handleError(error);
  }
}
