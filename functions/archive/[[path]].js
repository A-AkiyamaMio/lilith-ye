import { getSession } from "../_lib/session.js";

export async function onRequest({ request, env, next }) {
  if (!env.DB) return Response.redirect(new URL("/?reason=service", request.url), 302);
  const user = await getSession(request, env.DB);
  if (!user) return Response.redirect(new URL("/?reason=session", request.url), 302);
  return next();
}
