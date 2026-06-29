import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/site.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../scripts/site.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../scripts/auth-model.js", import.meta.url), "utf8");

for (const content of [html, css, js, auth]) {
  assert.doesNotMatch(content, /\/usr\/bin\/bash: warning/);
}

assert.match(html, /whispering-archive-login-v2\.png/);
assert.match(html, /whispering-archive-blink\.png/);
assert.match(html, /whispering-archive-success\.png/);
assert.match(html, /data-mode="login"/);
assert.match(html, /data-mode="apply"/);
assert.match(html, /scripts\/vendor\/gsap\.min\.js/);
assert.match(css, /application-sheet/);
assert.match(js, /gsap\.timeline/);
assert.match(js, /gsap\.matchMedia/);
assert.match(js, /Math\.min\(innerWidth \/ STAGE_WIDTH/);
assert.match(js, /scheduleBlink/);
assert.match(js, /success-candle-left/);
assert.match(js, /\/api\/auth\/register/);
assert.doesNotMatch(auth, /localStorage/);
assert.doesNotMatch(auth, /demoAccounts|ADMIN|password:\s*["']/);

console.log("static content tests passed");
