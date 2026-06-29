import { requestAccess, validateAccessInput } from "./auth-model.js";

const gsap = window.gsap;
const STAGE_WIDTH = 1664;
const STAGE_HEIGHT = 936;
const stage = document.querySelector("#stage-frame");
const form = document.querySelector("#access-form");
const tabs = [...document.querySelectorAll("[data-mode]")];
const message = document.querySelector("#form-message");
const submitButton = document.querySelector(".seal-button");
const sheetSubmit = document.querySelector(".sheet-submit");
const applicationSheet = document.querySelector("#application-sheet");
const sheetClose = document.querySelector(".sheet-close");
const lockedPopover = document.querySelector("#locked-popover");
const mobileTabs = [...document.querySelectorAll("[data-mobile-mode]")];
const mobileSubmit = document.querySelector(".mobile-submit");
const mobileApplicationFields = document.querySelector(".mobile-application-fields");
const mobileMessage = document.querySelector(".mobile-message");

let mode = "login";
let popoverTween;
let ambientTimeline;

const copy = {
  login: {
    button: "开启封印",
    message: "仅已获准的访问者可以进入夜藏馆。"
  },
  apply: {
    button: "递交契约",
    message: "申请会进入待审名单，通过后方可登录。"
  }
};

function resizeStage() {
  if (!stage || innerWidth <= 700) return;
  const scale = Math.max(innerWidth / STAGE_WIDTH, innerHeight / STAGE_HEIGHT);
  const x = (innerWidth - STAGE_WIDTH * scale) / 2;
  const y = (innerHeight - STAGE_HEIGHT * scale) / 2;
  stage.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

function setMessage(text, state = "") {
  message.textContent = text;
  message.className = `form-message${state ? ` is-${state}` : ""}`;
}

function clearInvalidState() {
  [...form.elements].forEach((element) => element.removeAttribute?.("aria-invalid"));
}

function setApplicationSheet(open) {
  if (open) {
    applicationSheet.hidden = false;
    gsap?.fromTo(applicationSheet,
      { autoAlpha: 0, y: 18, rotation: -0.7 },
      { autoAlpha: 1, y: 0, rotation: 0, duration: .45, ease: "power3.out", overwrite: "auto" }
    );
    document.querySelector("#display-name").focus({ preventScroll: true });
    return;
  }

  if (!applicationSheet.hidden && gsap) {
    gsap.to(applicationSheet, {
      autoAlpha: 0,
      y: 10,
      duration: .22,
      ease: "power2.in",
      overwrite: "auto",
      onComplete: () => { applicationSheet.hidden = true; }
    });
  } else {
    applicationSheet.hidden = true;
  }
}

function setMode(nextMode) {
  mode = nextMode;
  const currentCopy = copy[mode];

  tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  const password = form.elements.password;
  password.autocomplete = mode === "apply" ? "new-password" : "current-password";
  submitButton.setAttribute("aria-label", currentCopy.button);
  submitButton.querySelector(".button-label").textContent = currentCopy.button;
  setMessage(currentCopy.message);
  clearInvalidState();

  if (gsap) {
    gsap.to(".tab-indicator", {
      x: mode === "apply" ? 184 : 0,
      duration: .4,
      ease: "power3.out",
      overwrite: "auto"
    });
  }

  setApplicationSheet(mode === "apply");
}

function shakeForm() {
  if (!gsap || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.fromTo(form,
    { x: 0 },
    { keyframes: [{ x: -7 }, { x: 6 }, { x: -3 }, { x: 0 }], duration: .3, ease: "power2.out" }
  );
}

function revealLocked(messageText) {
  lockedPopover.textContent = `${messageText} · 仍在封印中`;
  popoverTween?.kill();
  gsap?.killTweensOf(lockedPopover);
  popoverTween = gsap?.timeline()
    .fromTo(lockedPopover, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .25, ease: "power2.out" })
    .to(lockedPopover, { autoAlpha: 0, y: -5, duration: .28, ease: "power2.in" }, "+=1.15");
}

function initMotion() {
  if (!gsap) return;

  const mm = gsap.matchMedia();
  mm.add({
    desktop: "(min-width: 701px)",
    reduceMotion: "(prefers-reduced-motion: reduce)"
  }, (context) => {
    const { desktop, reduceMotion } = context.conditions;
    if (!desktop || reduceMotion) {
      gsap.set([".artwork", ".contract-ui", ".archive-hotspots", ".moon-hotspot"], { clearProps: "all" });
      return;
    }

    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    intro
      .fromTo(".artwork", { autoAlpha: 0, scale: 1.025 }, { autoAlpha: 1, scale: 1, duration: 1.35 }, 0)
      .from(".contract-ui", { autoAlpha: 0, y: 18, duration: .8 }, .52)
      .from(".archive-hotspots button", { autoAlpha: 0, y: 8, duration: .48, stagger: .08 }, .78)
      .from(".moon-hotspot", { autoAlpha: 0, scale: .94, transformOrigin: "center", duration: .7 }, .66);

    ambientTimeline = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } })
      .to(".artwork", { x: -3.5, y: -2, scale: 1.006, duration: 12 }, 0)
      .to(".moon-light-pass", { autoAlpha: .24, scale: 1.008, duration: 4.8 }, 0)
      .to(".moon-light-pass", { autoAlpha: .08, duration: 2.8 }, 4.8);

    const xTo = gsap.quickTo(".visual-layer", "x", { duration: 1.1, ease: "power3.out" });
    const yTo = gsap.quickTo(".visual-layer", "y", { duration: 1.1, ease: "power3.out" });
    const contractX = gsap.quickTo(".contract-ui", "x", { duration: .9, ease: "power3.out" });
    const contractY = gsap.quickTo(".contract-ui", "y", { duration: .9, ease: "power3.out" });

    const pointerMove = (event) => {
      const nx = gsap.utils.normalize(0, innerWidth, event.clientX) - .5;
      const ny = gsap.utils.normalize(0, innerHeight, event.clientY) - .5;
      xTo(nx * -7);
      yTo(ny * -5);
      contractX(nx * 2.2);
      contractY(ny * 1.6);
    };

    addEventListener("pointermove", pointerMove, { passive: true });
    return () => {
      removeEventListener("pointermove", pointerMove);
      intro.kill();
      ambientTimeline?.kill();
    };
  });

  mm.add("(max-width: 700px) and (prefers-reduced-motion: no-preference)", () => {
    const mobileIntro = gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".mobile-kicker", { autoAlpha: 0, y: 8, duration: .45 })
      .from(".mobile-access h1", { autoAlpha: 0, y: 16, duration: .7 }, "<.08")
      .from([".mobile-lead", ".mobile-panel"], { autoAlpha: 0, y: 14, duration: .55, stagger: .1 }, "<.15");
    return () => mobileIntro.kill();
  });
}

tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
sheetClose.addEventListener("click", () => setMode("login"));

form.addEventListener("input", (event) => event.target.removeAttribute?.("aria-invalid"));

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
  sheetSubmit.disabled = true;
  setMessage(mode === "apply" ? "正在封缄契约……" : "正在辨认誓言……");

  try {
    const endpoint = mode === "apply" ? "/api/auth/register" : "/api/auth/login";
    const data = await requestAccess(endpoint, result.value);

    if (mode === "apply") {
      form.reset();
      setMessage(data.message || "申请已经封入信函，请等待守夜人的回应。", "success");
      setApplicationSheet(false);
      return;
    }

    setMessage("身份已确认，正在开启收藏馆……", "success");
    gsap?.to(".visual-layer", { autoAlpha: 0, scale: 1.02, duration: .6, ease: "power2.in" });
    setTimeout(() => window.location.assign(data.redirect || "/archive/"), 620);
  } catch (error) {
    const localPreview = error.status === 404 && ["localhost", "127.0.0.1"].includes(location.hostname);
    setMessage(
      localPreview ? "本地视觉预览正常；身份服务将在 Cloudflare 环境中启用。" : error.message,
      localPreview ? "success" : "error"
    );
    if (!localPreview) shakeForm();
  } finally {
    submitButton.disabled = false;
    sheetSubmit.disabled = false;
  }
});

document.querySelectorAll("[data-archive]").forEach((button) => {
  button.addEventListener("click", () => revealLocked(button.dataset.archive));
});

document.querySelector(".moon-hotspot").addEventListener("click", () => revealLocked("满月 · 100%"));

mobileTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    mobileTabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    const nextMode = tab.dataset.mobileMode;
    mobileApplicationFields.hidden = nextMode !== "apply";
    document.querySelector("#mobile-password").autocomplete = nextMode === "apply" ? "new-password" : "current-password";
    mobileSubmit.textContent = nextMode === "apply" ? "递交契约" : "开启封印";
    mobileMessage.textContent = copy[nextMode].message;
  });
});

mobileSubmit.addEventListener("click", () => {
  const activeMode = document.querySelector("[data-mobile-mode].is-active").dataset.mobileMode;
  form.elements.username.value = document.querySelector("#mobile-username").value;
  form.elements.password.value = document.querySelector("#mobile-password").value;
  form.elements.displayName.value = document.querySelector("#mobile-display-name").value;
  form.elements.note.value = document.querySelector("#mobile-note").value;
  setMode(activeMode);
  form.requestSubmit();
  mobileMessage.textContent = message.textContent;
});

new MutationObserver(() => {
  mobileMessage.textContent = message.textContent;
  mobileMessage.className = `mobile-message${message.classList.contains("is-error") ? " is-error" : message.classList.contains("is-success") ? " is-success" : ""}`;
}).observe(message, { childList: true, attributes: true, attributeFilter: ["class"] });

document.addEventListener("visibilitychange", () => {
  if (!ambientTimeline) return;
  document.hidden ? ambientTimeline.pause() : ambientTimeline.resume();
});

addEventListener("resize", resizeStage, { passive: true });
resizeStage();
setMode("login");
initMotion();
