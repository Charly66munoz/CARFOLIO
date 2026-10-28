# T2 validation — passed for the authorized prototype, 2026-10-23

The user explicitly authorized using the supplied transparent candidate, targeted center/position corrections and temporarily accepting minor visual differences. T2 was completed before T4 implementation. The older failed-export record is retained below as history, not as the current gate status.

## Current asset and preservation

- Copied `dist/assets/steering-wheel-neutral-DLpvQqP8.png` to `src/assets/steering-wheel-transparent-candidate.png` **before any further build**.
- Candidate: 1254 × 1254 RGBA, SHA-256 `8f64d15a8a90214184d38403d7163ece82ddd4621e7f3455e921781996e659bd`.
- Original: `src/assets/steering-wheel-neutral.png`, unchanged SHA-256 `568172172d2fe8807b03a0c5f171dff5ef33f0187dc45ef77ed4d0785f077872`.
- Neither PNG was edited, resampled, regenerated, overwritten or retouched. The candidate is now the prototype's imported image. The generated filename in `dist` is no longer the source of truth.

## Current acceptance results

| Criterion | Actual result |
|---|---|
| Transparency | Pass. Browser alpha scan and white/magenta composites show transparent background and openings. Upper opening `(627,381)` has alpha 0; no opaque disc or rectangle. The supplied material pixels are mostly alpha 253, with normal soft/low-alpha edge pixels; no opacity correction was applied. |
| Resolution | Pass. Candidate is 1254 × 1254, exceeding the target dimensions, and displayed at 87% of the 526-pixel stage to preserve the prior visible diameter. |
| Appearance | Pass for the authorized prototype. Rim, red stripe, GT3-inspired silhouette, crest, controls and dark material identity are retained. Crop, sharper markings and small material/detail differences were explicitly accepted temporarily. Final artwork refinement is deferred. |
| Center | Pass. Twelve sampled points on the circular silver hub housing produced source center `(625.95594,645.82089)`. The artwork is translated inside a stationary square and the enclosing rotor turns about the stage's 50%/50% center. |
| Rotation origin | Pass. An independent browser remeasurement of the image housing gives approximately `(625.95691,645.98797)`. Projecting that independently measured feature through the actual CSS transforms gives at most **0.072 CSS pixels** of pairwise movement across −36/−18/0/+18/+36 at a 526-pixel stage, and **0.037 pixels** at a 273-pixel stage. Verified at display densities 1 and 2. This is an image-derived feature/transform measurement, not an image-registration benchmark. |
| Lighting | Pass. The candidate's background and openings reveal the stationary page atmosphere. Intrinsic material highlights remain with the wheel; external Figma light/shadow SVGs remain outside the rotor. No background-removal operation was needed. |
| Interaction geometry | Pass under the user's updated circular-boundary requirement. Reference radius is `0.425 × stage width`; 1px reference plus 3px tolerance per side yields 7 CSS pixels. Only radial inclusion enables drag initiation. The center, spokes, opening, image corners and remote background are excluded. The circle deliberately surrounds the rim rather than tracing the flattened silhouette. |
| Visible boundary | Pass. The reference circle and red overlays exist only in the inspection sheet. Normal pointer use shows no circle/border. A separate visible focus outline remains available for keyboard users. |
| Initial composition | Pass. HOME at 0°, counter `03 / 05`, approved section order, palette, wheel scale and stationary atmosphere are retained. |
| Responsive baseline | Pass in Chrome at 1440 × 900, 320 × 740 and 1440 × 600. No horizontal page overflow; short/narrow layouts allow vertical scrolling. |

Evidence: `static-verification.json`, `asset-inspection.png`, `home-desktop.png`, `home-mobile.png`, `home-short.png` and `settled-*.png`. The inspection script checks mathematical circle inclusion/exclusion with the actual exported presentation configuration at both stage sizes. The circle width remains 7 CSS pixels at both tested display densities.

The full implementation report, actual automated commands and outstanding verification are in `T2_T6_IMPLEMENTATION.md`. There are no known functional T2 blockers. Final edge/material refinement and exact font acquisition are minor visual follow-ups; physical-device and cross-browser validation remain later work.

---

# Historical T1/T2 verification — 2026-10-22 (superseded)

## T1 foundation

Created the local React/Vite/TypeScript/Tailwind application, GSAP dependency, strict TypeScript projects, ESLint configuration, local npm cache configuration and ignore rules. React Strict Mode is enabled. Versions are pinned in `package.json` and `package-lock.json`.

The initial foundation passed `npm.cmd run typecheck`, `npm.cmd run lint` and `npm.cmd run build`. Chrome mounted it with the expected foundation text and no runtime exceptions; the intermediate record is `.tmp/foundation-verification.json`. The final static application was also checked with the same commands.

Node 22.19.0 satisfies the [Vite runtime requirement](https://vite.dev/guide/). Tailwind uses its [Vite plugin](https://tailwindcss.com/docs/installation/using-vite). No global tooling or machine settings were changed. npm cache, temporary files, browser profiles, installed modules and build output are inside `carfolio`. No Git repository exists, and no Git initialization or remote action was performed.

## T2 decision

**Static presentation delivered; asset validation has not passed. Do not begin interactive rotation on the assumption that this asset is ready.** The source was not cut out, retouched, regenerated or replaced. The screenshots and composites are inspection artifacts only.

Source: [approved Figma HOME frame](https://www.figma.com/design/oEXjYLVP8tfpWG5PO16x1o?node-id=5-2), wheel node `5:22`. Current metadata confirms the wheel is an ellipse at `(457, 328)`, size `526 × 526`; design context and screenshots confirm the neutral red stripe, controls, proportions, materials and Porsche badge.

The exact wheel asset supplied by `get_design_context` is stored as `src/assets/steering-wheel-neutral.png` at **1052 × 1052**. SHA-256: `568172172d2fe8807b03a0c5f171dff5ef33f0187dc45ef77ed4d0785f077872`.

An independent 2× `download_assets` node export returned an opaque square, unlike the ellipse shown by Figma. It was retained only in `.tmp/wheel-export-rectangle.png` for diagnosis. The application uses the unchanged design-context asset, which preserves Figma's circular mask. The original uploaded fill is a 1024 × 1024 JPEG; rendering it at 1052 does not add native detail.

| Check | Evidence and result |
|---|---|
| Transparency | Full browser canvas scan: 1,106,704 pixels, alpha range 0–255; 238,872 pixels have alpha below 255. Corners are transparent, but the circle and the wheel openings contain an opaque dark photographic background. White/magenta composites clearly show this disc. **Fails the requirement for no unintended opaque disc.** |
| Resolution | 1052 × 1052 output meets the nominal 2× dimensions for the 526 CSS-pixel stage. The underlying JPEG is 1024 × 1024, so native detail falls slightly below the target. No source enhancement was performed. |
| Center | Visual estimate of the hub is approximately `(526, 540)` in the 1052-pixel image, below the stage center `(526, 526)`. This is a provisional visual estimate, not a verified subpixel calibration. `presentation.ts` records the candidate without applying a correction. |
| Origin | Temporary static previews at −36°, 0° and +36° use the stage center. A 14-source-pixel vertical offset would cause about 4.3 CSS pixels of hub movement between 0° and either endpoint at a 526 CSS-pixel stage. The later ≤1 CSS-pixel requirement is **not certified**. No application rotation was implemented. |
| Lighting | Intrinsic rim/spoke highlights are visible, along with baked background lighting inside the circle and openings. That environmental content would turn with the image. The separate Figma atmosphere and external-shadow SVGs stay in stationary DOM layers. **Baked environmental lighting remains unresolved.** |
| Appearance | Visually compared the unchanged local ellipse against the HOME context screenshot: neutral stripe, proportions, controls, badge and material treatment are preserved. Local font fallback is intentional; exact font acquisition remains deferred. Counter corrected to `03 / 05` as required. |
| Rim region | Red overlays show the proposed 0.30–0.41 stage-radius annulus. It roughly covers the rim but includes some opening/control pixels at its inner boundary and does not follow the flattened lower contour precisely. These values remain **provisional and unsuitable for approval as an exact rim hit region**. There is no pointer hit testing in T2. Recalibrate after the artwork decision. |

## Static composition and layout

The page preserves `ABOUT | EXPERIENCE | HOME | PROJECTS | STACK`, HOME at 0°, the five palette tokens, 250-pixel desktop slots, neutral original wheel, stationary atmosphere, header, cues and footer. Static section and contact labels have no pretend activation handlers. A visible preview notice explains the current interaction status.

All five visible static assets were checked as local, nonempty files, associated with their Figma layers and actual component callsites:

| Local asset | Source node | Callsite / desktop geometry |
|---|---|---|
| `steering-wheel-neutral.png` | `5:22` | `SteeringWheel.tsx`; stage `(457, 328)`, 526 × 526; image fills stage without distortion |
| `atmosphere-graphite.svg` | `5:3` | `SteeringWheelNavigator.tsx`; 716 × 716 layer at `(362, 230)` with 210-pixel blur expansion, native SVG 1136 × 1136 |
| `atmosphere-silver.svg` | `5:4` | `SteeringWheelNavigator.tsx`; 320 × 320 layer at `(560, 365)` with 155-pixel blur expansion, native SVG 630 × 630 |
| `wheel-shadow.svg` | `5:21` | `SteeringWheel.tsx`; 500 × 500 layer at `(470, 355)` with 35-pixel expansion, native SVG 570 × 570 |
| `status-indicator.svg` | `5:10` | `App.tsx`; 7 × 7 indicator alongside availability text; header uses responsive flex layout |

Headless Chrome 155 verified all images decode, no runtime exceptions, correct ordered labels and counter, centered HOME within 1 CSS pixel of the usable viewport center, and no horizontal document overflow at:

- 1440 × 900: stage 526 × 526 at `(457, 328)`.
- 320 × 740: stage 273 × 273 at `(16, 341)`; the scrollbar leaves a 305-pixel usable width. Content scrolls vertically.
- 1440 × 600: stage 526 × 526; content scrolls vertically. Centering accounts for the vertical scrollbar.

An initial check exposed minimum-width overflow on the narrow screen and a measurement that incorrectly included scrollbar width. Both were corrected before the final captures. See `static-verification.json`, `home-*.png` and `asset-inspection.png` beside this report.

## Remaining work

The T2 asset gate remains open for the opaque disc, baked lighting, hub calibration and rim-region alignment. Any corrective artwork change requires user authorization under the existing plan. No artwork correction was attempted.

T3–T8 remain unstarted. Interactive rotation, pointer capture, snapping, confirmation, keyboard controls, screen-reader behavior, reduced-motion behavior, physical touch devices, Firefox and WebKit were not tested in this static phase. Comprehensive browser testing remains T8.

Local Git status: `git status --short` reports that this directory is not a Git repository. All work remains local.
