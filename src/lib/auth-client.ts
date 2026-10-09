type LoginPayload = { ok?: boolean; next?: string; message?: string; retryAfter?: number };
type SessionPayload = { authenticated?: boolean; administrator?: { label?: string } };

function setStatus(element: HTMLElement, message: string, state = '') {
  element.textContent = message;
  element.dataset.state = state;
}

export function initLoginForm() {
  const form = document.querySelector<HTMLFormElement>('#login-form');
  if (!form) return;
  const identifier = form.elements.namedItem('identifier') as HTMLInputElement;
  const password = form.elements.namedItem('password') as HTMLInputElement;
  const remember = form.elements.namedItem('remember') as HTMLInputElement;
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const status = form.querySelector<HTMLElement>('[data-auth-status]');
  const toggle = form.querySelector<HTMLButtonElement>('[data-password-toggle]');
  if (!identifier || !password || !remember || !submitButton || !status) return;

  toggle?.addEventListener('click', () => {
    const showing = password.type === 'text';
    password.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? '显示' : '隐藏';
    toggle.setAttribute('aria-pressed', String(!showing));
    password.focus();
  });

  void fetch('/api/auth/session', { headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() as Promise<SessionPayload> : null)
    .then((payload) => { if (payload?.authenticated) window.location.assign('/archive/'); })
    .catch(() => undefined);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    submitButton.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus(status, '正在确认镜后的身份…', 'loading');
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier: identifier.value, password: password.value, remember: remember.checked, next }),
      });
      const payload = await response.json() as LoginPayload;
      if (response.ok && payload.ok && typeof payload.next === 'string') {
        setStatus(status, '身份已确认，正在打开档案。', 'success');
        window.location.assign(payload.next);
        return;
      }
      setStatus(status, payload.message ?? '暂时无法登录，请稍后再试。', response.status === 429 ? 'blocked' : 'error');
    } catch {
      setStatus(status, '连接中断了，请稍后再试。', 'error');
    } finally {
      submitButton.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}

export function initArchiveSessionControls() {
  const label = document.querySelector<HTMLElement>('[data-administrator-label]');
  const logout = document.querySelector<HTMLButtonElement>('[data-logout]');
  if (!label || !logout) return;
  void fetch('/api/auth/session', { headers: { Accept: 'application/json' } })
    .then(async (response) => ({ response, payload: await response.json() as SessionPayload }))
    .then(({ response, payload }) => {
      if (!response.ok || !payload.authenticated) { window.location.assign('/login/'); return; }
      label.textContent = payload.administrator?.label ?? 'Mio';
    })
    .catch(() => { label.textContent = 'Mio'; });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await fetch('/api/auth/logout', { method: 'POST', headers: { Accept: 'application/json' } }); }
    finally { window.location.assign('/login/'); }
  });
}
