import { handleError, HttpError, json } from "../../_lib/http.js";
import { getSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) throw new HttpError(503, "database_unavailable", "身份服务尚未配置。 ");
    const user = await getSession(request, env.DB);
    if (!user) return json({ ok: true, authenticated: false });
    return json({ ok: true, authenticated: true, user });
  } catch (error) {
    return handleError(error);
  }
}
