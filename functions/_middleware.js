const SESSION_COOKIE = "lilith_session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

const LOGIN_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>lilith-ye.vip · Private</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100vh;
      background: #0c0c0e;
      color: #eadfd4;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
    }
    body {
      display: grid;
      place-items: center;
      padding: 24px;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        radial-gradient(1px 1px at 18% 24%, rgba(255,235,214,.85), transparent),
        radial-gradient(1px 1px at 42% 68%, rgba(212,184,160,.8), transparent),
        radial-gradient(1px 1px at 72% 18%, rgba(255,235,214,.75), transparent),
        radial-gradient(1px 1px at 84% 82%, rgba(212,184,160,.65), transparent),
        radial-gradient(circle at 50% 40%, rgba(128,72,86,.18), transparent 34%),
        linear-gradient(135deg, #0c0c0e 0%, #151114 54%, #0c0c0e 100%);
      background-size: 220px 220px,220px 220px,220px 220px,220px 220px,100% 100%,100% 100%;
      z-index: -2;
    }
    body::after {
      content: "";
      position: fixed;
      width: 360px;
      height: 360px;
      right: -120px;
      top: -120px;
      border-radius: 999px;
      background: radial-gradient(circle at 38% 42%, rgba(238,216,194,.24), rgba(190,150,134,.08) 42%, transparent 70%);
      filter: blur(.2px);
      z-index: -1;
    }
    .card {
      width: min(92vw, 420px);
      padding: 42px 34px 32px;
      border: 1px solid rgba(216,184,160,.18);
      border-radius: 24px;
      background: rgba(12,12,14,.72);
      box-shadow: 0 24px 80px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.04);
      backdrop-filter: blur(18px);
      text-align: center;
    }
    .sigil {
      margin: 0 auto 12px;
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      border: 1px solid rgba(216,184,160,.25);
      color: #d8b8a0;
      box-shadow: 0 0 36px rgba(216,184,160,.1);
      font-size: 22px;
    }
    h1 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(34px, 8vw, 52px);
      line-height: 1;
      letter-spacing: .05em;
      background: linear-gradient(135deg, #f2d8b8, #c8a890 54%, #a87872);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .sub {
      margin: 12px 0 30px;
      color: #8f7b6d;
      letter-spacing: .28em;
      font-size: 12px;
      text-transform: uppercase;
    }
    label {
      display: block;
      margin: 0 0 8px;
      text-align: left;
      color: #8f7b6d;
      font-size: 12px;
      letter-spacing: .16em;
      text-transform: uppercase;
    }
    input {
      width: 100%;
      margin: 0 0 18px;
      padding: 14px 15px;
      border: 1px solid rgba(216,184,160,.18);
      border-radius: 14px;
      outline: none;
      background: rgba(24,22,25,.9);
      color: #eadfd4;
      font-size: 15px;
      transition: border-color .2s, box-shadow .2s, background .2s;
    }
    input:focus {
      border-color: rgba(216,184,160,.62);
      background: rgba(30,27,29,.95);
      box-shadow: 0 0 0 4px rgba(216,184,160,.07);
    }
    button {
      width: 100%;
      margin-top: 4px;
      padding: 14px 18px;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, #dfc0a7, #bd947f);
      color: #121013;
      font-weight: 800;
      letter-spacing: .12em;
      cursor: pointer;
      box-shadow: 0 16px 36px rgba(189,148,127,.12);
    }
    button:hover { filter: brightness(1.06); }
    .error {
      min-height: 20px;
      margin: 18px 0 0;
      color: #d27b70;
      font-size: 13px;
    }
    .footer {
      margin-top: 28px;
      color: #58483d;
      font-size: 11px;
      letter-spacing: .22em;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="sigil">✦</div>
    <h1>lilith-ye</h1>
    <div class="sub">private realm</div>
    <form method="post" action="/_auth/login">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required autofocus />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">ENTER</button>
    </form>
    <p class="error">{{ERROR}}</p>
    <div class="footer">1107 · forever</div>
  </main>
</body>
</html>`;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/cdn-cgi/")) return next();

  if (url.pathname === "/_auth/logout") {
    return redirect("/_auth", {
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    });
  }

  if (url.pathname === "/_auth" && request.method === "GET") {
    return loginPage(url.searchParams.has("error"));
  }

  if (url.pathname === "/_auth/login" && request.method === "POST") {
    return handleLogin(request, env);
  }

  if (await isAuthenticated(request, env)) {
    return next();
  }

  return redirect("/_auth");
}

async function handleLogin(request, env) {
  const form = await request.formData();
  const username = String(form.get("username") || "");
  const password = String(form.get("password") || "");

  const expectedUser = env.AUTH_USER;
  const expectedPass = env.AUTH_PASS;

  if (!expectedUser || !expectedPass || !env.SESSION_SECRET) {
    return new Response("Auth is not configured. Please set AUTH_USER, AUTH_PASS and SESSION_SECRET in Cloudflare Pages environment variables.", { status: 500 });
  }

  if (safeEqual(username, expectedUser) && safeEqual(password, expectedPass)) {
    const ttl = Number(env.SESSION_TTL_SECONDS || DEFAULT_TTL_SECONDS);
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const token = await sign(`${username}.${expires}`, env.SESSION_SECRET);
    return redirect("/", {
      "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}`,
    });
  }

  return redirect("/_auth?error=1");
}

async function isAuthenticated(request, env) {
  if (!env.SESSION_SECRET) return false;
  const cookie = request.headers.get("Cookie") || "";
  const value = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`));
  if (!value) return false;

  const token = value.slice(SESSION_COOKIE.length + 1);
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [username, expiresText, mac] = parts;
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000)) return false;

  const expected = await hmac(`${username}.${expiresText}`, env.SESSION_SECRET);
  return safeEqual(mac, expected);
}

async function sign(payload, secret) {
  return `${payload}.${await hmac(payload, secret)}`;
}

async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(sig);
}

function base64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function loginPage(hasError) {
  return new Response(LOGIN_PAGE.replace("{{ERROR}}", hasError ? "账号或密码不对，再试一次。" : ""), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function redirect(location, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, ...headers },
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
