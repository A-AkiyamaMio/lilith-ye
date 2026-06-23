import { authenticate, demoAccounts, getLandingPath } from "./auth-model.js";

const root = document.documentElement;
const form = document.querySelector("#login-form");
const message = document.querySelector("#form-message");
const inside = document.querySelector("#night-archive");
const vault = document.querySelector("#admin-vault");
const login = document.querySelector("#login");
const accountList = document.querySelector("#account-list");
const aura = document.querySelector(".cursor-aura");
const musicToggle = document.querySelector(".music-toggle");
const whispers = [
  "Do not wake the roses before midnight.",
  "The moon remembers every visitor.",
  "A key is only a promise with sharper edges.",
  "If her eyes follow you, the gate has already opened."
];

let activeUser = null;
let sealTaps = 0;

function setupEyeDebugger() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") !== "eyes") return;

  document.body.classList.add("debug-eyes");

  const values = {
    "--eye-left-x": parseFloat(getComputedStyle(root).getPropertyValue("--eye-left-x")),
    "--eye-left-y": parseFloat(getComputedStyle(root).getPropertyValue("--eye-left-y")),
    "--eye-right-x": parseFloat(getComputedStyle(root).getPropertyValue("--eye-right-x")),
    "--eye-right-y": parseFloat(getComputedStyle(root).getPropertyValue("--eye-right-y"))
  };

  const panel = document.createElement("aside");
  panel.className = "debug-eyes-panel";
  panel.innerHTML = `
    <h2>Eye calibration</h2>
    ${Object.keys(values).map((name) => `
      <label>
        <span>${name.replace("--eye-", "").replace("-", " ")}</span>
        <input type="range" min="0" max="100" step="0.1" value="${values[name]}" data-eye-var="${name}">
        <output>${values[name].toFixed(1)}%</output>
      </label>
    `).join("")}
    <pre class="debug-eyes-output"></pre>
  `;
  document.body.append(panel);

  const output = panel.querySelector(".debug-eyes-output");
  const render = () => {
    const lines = Object.entries(values).map(([name, value]) => `  ${name}: ${value.toFixed(1)}%;`);
    output.textContent = `:root {\n${lines.join("\n")}\n}`;
  };

  panel.querySelectorAll("input[type='range']").forEach((input) => {
    input.addEventListener("input", () => {
      const name = input.dataset.eyeVar;
      const value = Number(input.value);
      values[name] = value;
      root.style.setProperty(name, `${value}%`);
      input.nextElementSibling.textContent = `${value.toFixed(1)}%`;
      render();
    });
  });

  render();
}

function setMessage(text, state) {
  message.textContent = text;
  message.classList.toggle("is-error", state === "error");
  message.classList.toggle("is-success", state === "success");
}

function showInside(user) {
  activeUser = user;
  login.hidden = true;
  login.classList.remove("accepting-night");
  inside.hidden = false;
  vault.hidden = getLandingPath(user) !== "#admin-vault";
  if (!vault.hidden) renderAccounts();
  document.querySelector("[data-whisper-text]").textContent =
    `“${whispers[Math.floor(Math.random() * whispers.length)]}”`;
  location.hash = getLandingPath(user);
}

function renderAccounts() {
  accountList.replaceChildren(
    ...demoAccounts.map((account) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const role = document.createElement("strong");
      name.textContent = account.displayName;
      role.textContent = account.role;
      item.append(name, role);
      return item;
    })
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const result = authenticate(demoAccounts, data.get("username"), data.get("password"));

  if (!result.ok) {
    setMessage("The gate rejects this key.", "error");
    form.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
      { duration: 220, easing: "ease-out" }
    );
    return;
  }

  setMessage("The covenant is sealed.", "success");
  login.classList.add("accepting-night");
  setTimeout(() => showInside(result.user), 2650);
});

document.querySelector("[data-logout]").addEventListener("click", () => {
  activeUser = null;
  inside.hidden = true;
  vault.hidden = true;
  login.hidden = false;
  login.classList.remove("accepting-night");
  form.reset();
  setMessage("The covenant waits for your whisper.");
  location.hash = "#login";
});

document.querySelector("[data-vault-trigger]").addEventListener("click", () => {
  if (activeUser?.role !== "admin") {
    return;
  }
  vault.hidden = false;
  renderAccounts();
  location.hash = "#admin-vault";
});

document.querySelector("[data-close-vault]").addEventListener("click", () => {
  vault.hidden = true;
  location.hash = "#night-archive";
});

document.querySelector("[data-admin-seal]").addEventListener("click", (event) => {
  if (!event.shiftKey) return;
  event.preventDefault();
  sealTaps += 1;
  if (sealTaps >= 3) {
    document.querySelector("#username").value = "admin";
    setMessage("Keeper name remembered. The final vow is still yours to know.", "success");
    sealTaps = 0;
  }
});

musicToggle.addEventListener("click", () => {
  const enabled = musicToggle.getAttribute("aria-pressed") !== "true";
  musicToggle.setAttribute("aria-pressed", String(enabled));
  musicToggle.querySelector("strong").textContent = enabled ? "ON" : "OFF";
});

window.addEventListener("pointermove", (event) => {
  const x = (event.clientX / window.innerWidth) * 100;
  const y = (event.clientY / window.innerHeight) * 100;
  root.style.setProperty("--x", `${x}%`);
  root.style.setProperty("--y", `${y}%`);
  root.style.setProperty("--danger-x", `${x}%`);
  root.style.setProperty("--danger-y", `${y}%`);

  const stage = document.querySelector(".login-stage");
  if (stage.hidden) return;

  const eyes = [...document.querySelectorAll(".eye-glow")];
  const nearest = eyes.reduce((distance, eye) => {
    const rect = eye.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.min(distance, Math.hypot(event.clientX - cx, event.clientY - cy));
  }, Number.POSITIVE_INFINITY);

  const intensity = Math.max(0, 1 - nearest / 180);
  root.style.setProperty("--eye-opacity", String(intensity * .72));
  root.style.setProperty("--eye-alpha", `${intensity * 52}%`);
  root.style.setProperty("--eye-glow", `${6 + intensity * 16}px`);
  root.style.setProperty("--eye-scale", String(1 + intensity * .08));
  root.style.setProperty("--danger", `${intensity * 9}%`);
  aura.style.setProperty("--aura", String(.16 + intensity * .18));
});

function startEmbers() {
  const canvas = document.querySelector("#embers");
  const context = canvas.getContext("2d");
  const particles = Array.from({ length: 54 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: .12 + Math.random() * .32,
    size: .8 + Math.random() * 2.4,
    drift: -.12 + Math.random() * .24
  }));

  function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const particle of particles) {
      particle.y -= particle.speed / window.innerHeight;
      particle.x += particle.drift / window.innerWidth;
      if (particle.y < -0.04) {
        particle.y = 1.04;
        particle.x = Math.random();
      }
      const px = particle.x * canvas.width;
      const py = particle.y * canvas.height;
      context.beginPath();
      context.fillStyle = "rgba(206, 83, 68, .42)";
      context.shadowColor = "rgba(207, 50, 54, .55)";
      context.shadowBlur = 10;
      context.arc(px, py, particle.size * window.devicePixelRatio, 0, Math.PI * 2);
      context.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  draw();
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  startEmbers();
}

setupEyeDebugger();
