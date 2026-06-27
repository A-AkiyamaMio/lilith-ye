import { assertSameOrigin, handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) throw new HttpError(503, "database_unavailable", "身份服务尚未配置。 ");
    await requireAdmin(request, env.DB);
    const result = await env.DB.prepare(`
      SELECT id, username, display_name AS displayName, application_note AS note, status, created_at AS createdAt
      FROM users
      WHERE role = 'visitor'
      ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 100
    `).all();
    return json({ ok: true, applications: result.results || [] });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) throw new HttpError(503, "database_unavailable", "身份服务尚未配置。 ");
    assertSameOrigin(request);
    const admin = await requireAdmin(request, env.DB);
    const input = await readJson(request);
    const userId = Number(input.userId);
    const action = String(input.action || "");
    if (!Number.isInteger(userId) || !["approve", "reject", "suspend"].includes(action)) {
      throw new HttpError(400, "invalid_action", "审批操作不正确。 ");
    }

    const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended";
    const result = await env.DB.prepare(`
      UPDATE users
      SET status = ?, reviewed_at = datetime('now'), reviewed_by = ?
      WHERE id = ? AND role = 'visitor'
    `).bind(status, admin.id, userId).run();

    if (!result.meta?.changes) throw new HttpError(404, "application_not_found", "没有找到这份申请。 ");
    return json({ ok: true, userId, status });
  } catch (error) {
    return handleError(error);
  }
}
