export function normalizeUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function validateAccessInput(mode, values) {
  const username = normalizeUsername(values.username);
  const password = String(values.password ?? "");
  const errors = {};

  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    errors.username = "名字需要 3–32 位，只能使用字母、数字、下划线、点与连字符。";
  }

  if (mode === "apply" && password.length < 10) {
    errors.password = "月下誓言至少需要 10 位。";
  } else if (!password) {
    errors.password = "请输入月下誓言。";
  }

  if (mode === "apply" && String(values.displayName ?? "").trim().length > 40) {
    errors.displayName = "称呼不能超过 40 个字符。";
  }

  if (mode === "apply" && String(values.note ?? "").trim().length > 500) {
    errors.note = "来访缘由不能超过 500 个字符。";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      username,
      password,
      displayName: String(values.displayName ?? "").trim(),
      note: String(values.note ?? "").trim()
    }
  };
}

export async function requestAccess(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const previewDiagnostic = location.hostname.endsWith(".pages.dev") && data.diagnostic
      ? ` (${data.diagnostic})`
      : "";
    const error = new Error(`${data.message || "身份服务暂时不可用。"}${previewDiagnostic}`);
    error.code = data.code || "request_failed";
    error.status = response.status;
    throw error;
  }

  return data;
}
