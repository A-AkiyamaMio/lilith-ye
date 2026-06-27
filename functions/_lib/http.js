export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

export async function readJson(request, maxBytes = 16_384) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new HttpError(413, "payload_too_large", "请求内容过长。");

  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "json_required", "请求必须使用 JSON。 ");
  }

  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "invalid_json", "请求内容无法读取。");
  }
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new HttpError(403, "origin_rejected", "请求来源未获允许。");
  }
}

export function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function handleError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, code: error.code, message: error.message }, error.status);
  }
  console.error(error);
  return json({ ok: false, code: "internal_error", message: "夜之门暂时无法回应。" }, 500);
}
