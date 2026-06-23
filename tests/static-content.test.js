import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/site.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../scripts/site.js", import.meta.url), "utf8");

assert.match(html, /intro-curtain/);
assert.match(html, /night-letter/);
assert.match(html, /ACCEPT THE NIGHT/);
assert.match(html, /lilith-sigil/);
assert.match(css, /letterArrives/);
assert.match(css, /castleApproach/);
assert.match(js, /accepting-night/);

console.log("static content tests passed");
