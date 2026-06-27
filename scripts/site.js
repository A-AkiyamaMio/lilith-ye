import { requestAccess, validateAccessInput } from "./auth-model.js";

const root = document.documentElement;
const form = document.querySelector("#access-form");
const tabs = [...document.querySelectorAll("[data-mode]")];
const message = document.querySelector("#form-message");
const title = document.querySelector("#form-title");
const kicker = document.querySelector("#form-kicker");
const buttonLabel = document.querySelector(".button-label");
const submitButton = document.querySelector(".submit-button");
const applyOnly = [...document.querySelectorAll(".apply-only")];

let mode = "login";

const copy = {
  login: {
    kicker: "THE REMEMBERED",
    title: "以获准的名字进入",
    button: "开启封印",
    message: "仅已获批准的访客可以进入收藏馆。"
  },
  apply: {
    kicker: "A NEW COVENANT",
    title: "向守夜人递交申请",
    button: "递交契约",
    message: "申请会进入待审名单，通过后才能登录。"
  }
};

function setMessage(text, state = "") {
  message.textContent = text;
  message.className = `form-message${state ? ` is-${state}` : ""}`;
}

function setMode(nextMode) {
  mode = nextMode;
  const currentCopy = copy[mode];

  tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  applyOnly.forEach((element) => {
    element.hidden = mode !== "apply";
  });

  const password = form.elements.password;
  password.autocomplete = mode === "apply" ? "new-password" : "current-password";
  title.textContent = currentCopy.title;
  kicker.textContent = currentCopy.kicker;
  buttonLabel.textContent = currentCopy.button;
  setMessage(currentCopy.message);
  clearInvalidState();
}

function clearInvalidState() {
  [...form.elements].forEach((element) => element.removeAttribute?.("aria-invalid"));
}

function shakeForm() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  form.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-7px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(0)" }
    ],
    { duration: 230, easing: "ease-out" }
  );
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

form.addEventListener("input", (event) => {
  event.target.removeAttribute?.("aria-invalid");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearInvalidState();

  const values = Object.fromEntries(new FormData(form));
  const result = validateAccessInput(mode, values);

  if (!result.ok) {
    for (const fieldName of Object.keys(result.errors)) {
      form.elements[fieldName]?.setAttribute("aria-invalid", "true");
    }
    setMessage(Object.values(result.errors)[0], "error");
    shakeForm();
    return;
  }

  submitButton.disabled = true;
  buttonLabel.textContent = mode === "apply" ? "正在封缄…" : "正在辨认…";

  try {
    const endpoint = mode === "apply" ? "/api/auth/register" : "/api/auth/login";
    const data = await requestAccess(endpoint, result.value);

    if (mode === "apply") {
      form.reset();
      setMessage(data.message || "申请已经封入信函，请等待守夜人的回应。", "success");
      return;
    }

    setMessage("身份已确认，正在开启收藏馆…", "success");
    window.setTimeout(() => {
      window.location.assign(data.redirect || "/archive/");
    }, 650);
  } catch (error) {
    const localPreview = error.status === 404 && ["localhost", "127.0.0.1"].includes(location.hostname);
    setMessage(
      localPreview ? "本地视觉预览正常；身份服务将在 Cloudflare 环境中启用。" : error.message,
      localPreview ? "success" : "error"
    );
    if (!localPreview) shakeForm();
  } finally {
    submitButton.disabled = false;
    buttonLabel.textContent = copy[mode].button;
  }
});

window.addEventListener("pointermove", (event) => {
  root.style.setProperty("--mx", `${(event.clientX / innerWidth) * 100}%`);
  root.style.setProperty("--my", `${(event.clientY / innerHeight) * 100}%`);
}, { passive: true });

function startEmbers() {
  const canvas = document.querySelector("#embers");
  const context = canvas.getContext("2d", { alpha: true });
  const particles = Array.from({ length: Math.min(48, Math.ceil(innerWidth / 30)) }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: .35 + Math.random() * 1.25,
    speed: .06 + Math.random() * .14,
    drift: (Math.random() - .5) * .05,
    alpha: .08 + Math.random() * .28
  }));
  let width = 0;
  let height = 0;
  let ratio = 1;

  function resize() {
    ratio = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      particle.y -= particle.speed / height;
      particle.x += particle.drift / width;
      if (particle.y < -.03 || particle.x < -.03 || particle.x > 1.03) {
        particle.x = .1 + Math.random() * .9;
        particle.y = 1.03;
      }

      const x = particle.x * width;
      const y = particle.y * height;
      context.beginPath();
      context.fillStyle = `rgba(205, 91, 79, ${particle.alpha})`;
      context.shadowColor = "rgba(167, 55, 71, .42)";
      context.shadowBlur = 8;
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  addEventListener("resize", resize, { passive: true });
  draw();
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  startEmbers();
}

setMode("login");
