# Design QA · Whispering Archive entrance v2

- Source visual truth: `assets/whispering-archive-login-v2.png`
- User issue evidence: `C:/Users/Administrator/AppData/Local/Temp/codex-clipboard-14de7b84-a704-422c-b393-465f7454840d.png`
- Implementation screenshot: `tmp/design/implementation-wide-v2.png`
- Success transition screenshot: `tmp/design/success-transition-v2.png`
- Mobile screenshot: `tmp/design/mobile-v2.png`
- Combined comparison: `tmp/design/qa-comparison-v2.png`
- Desktop viewport: 1911 × 917
- Mobile viewport: 390 × 844
- States: desktop login, filled controls, application tab, success transition, mobile login/application

## Findings

- P0: none
- P1: none
- P2: none
- P3: ultra-wide screens intentionally use a dark same-image ambient extension at the sides so the complete 16:9 composition remains visible without stretching or cropping.

## Required fidelity surfaces

- Fonts and typography: baked display typography remains in the reference artwork; live form text uses the established serif stack at matching optical weight.
- Spacing and layout rhythm: the 1664 × 936 stage is now contain-scaled and centered. At 1911 × 917 it renders at 1630.22 × 917 with no top, bottom, left, or right artwork crop. Live fields align to the illustrated fields.
- Colors and tokens: parchment, black, wine, gold, and moon-violet values remain unchanged; browser autofill is normalized to the dark field surface.
- Image quality and asset fidelity: the dress is satin/fine fabric with lace limited to trim. Blink and success states use dedicated raster frames rather than code-drawn substitutes.
- Copy and content: login, application, approval, archive labels, and status copy are preserved.

## Patches made since the previous QA pass

- Replaced cover scaling with contain scaling and same-source ambient side fill.
- Repainted the dress material and preserved partial lace trim.
- Added dedicated blink and login-success raster frames.
- Added GSAP hair, dress, moon, eye-glint, blink, candle-extinguish, seal-crack, and entry timelines.
- Corrected browser autofill styling and moved the status line below the seal.
- Deferred desktop-only motion assets on mobile.

Full-view and focused login/dress comparisons show no actionable mismatch. The success-state frame verifies both candle flames are extinguished and the seal is visibly split before the page fades into the archive.

final result: passed
