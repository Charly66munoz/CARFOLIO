# Carfolio

Local steering-wheel portfolio prototype for Agustín López. React, Vite, strict TypeScript, Tailwind CSS and GSAP core. The approved design and mechanical contracts are in `PROJECT_CONTEXT.md` and `IMPLEMENTATION_PLAN.md`.

## Current delivery

- **T1 complete:** application foundation, local tooling, pinned dependencies and lockfile.
- **T2 complete:** authorized transparent candidate, preserved original and fixed hub. The current initiation region follows the outer contour at depths 1–45 CSS pixels. See [asset validation](docs/T2_ASSET_VALIDATION.md).
- **T3 complete:** independent mathematical helpers and 86 passing Vitest tests. See [T3 verification](docs/T3_VERIFICATION.md). Section angles, limits and step size derive from one configuration. Mathematical hit testing does not certify artwork calibration.
- **T4–T6 finished:** native mouse/touch Pointer Events, capture, cancellation, a single GSAP snap, synchronized horizontal track, keyboard controls and explicit confirmation. See [historical implementation report](docs/T2_T6_IMPLEMENTATION.md).
- **T7 implemented:** navigation semantics, configuration-derived help, retained endpoint-button focus, keyboard alternatives, reduced motion, mobile scrolling and confirmation controls separated from the wheel surface.
- **T8 automated validation complete:** 43 browser tests passed, with 2 intentional Chromium-only capability skips. See [current verification and remaining manual checks](docs/T7_T8_VALIDATION.md) for actual results. Physical-device and screen-reader checks remain pending. Contact labels remain reference text; no destination pages or routes exist.

Drag within the invisible band 1 to 45 CSS pixels inside the visible wheel rim. The band follows the artwork as it rotates; the central hub remains reserved for confirmation. Use Left/Right (also Down/Up), previous/next buttons or section labels as alternatives. Home key selects ABOUT; End selects STACK. Enter, the wheel center, the active label or the ENTER button confirms. An inactive label selects on the first activation and confirms on a later activation. Feedback records the confirmed section without navigating.

The configurable band insets and hub size are in `src/features/wheel-navigation/presentation.ts`. The fixed contour is calibrated from the unchanged transparent asset; runtime hit testing follows its scale, hub and rotation. Keyboard focus retains the compact badge. Only the artwork rotates; lighting, shadow and interaction surface stay fixed.

The approved 1–45px band, section mapping, artwork and steering mechanics are preserved. Endpoint arrows remain focusable with `aria-disabled` at their limits; activating a limited arrow does nothing, and the opposite arrow key can immediately reverse direction. Confirmation controls are below the desktop wheel surface. Historical circle/ring and 11px reports do not describe the current geometry.

## Run locally

Verified with Node 22.19.0 and npm 10.9.3 on Windows. Use `npm.cmd` in PowerShell where script execution policy blocks `npm.ps1`.

```powershell
cd C:\Users\agust\Desktop\Proyectos\Codex\carfolio
New-Item -ItemType Directory -Force .tmp | Out-Null
$env:TEMP = Join-Path (Get-Location) '.tmp'
$env:TMP = $env:TEMP
npm.cmd ci --no-audit
npm.cmd run dev
```

Open http://127.0.0.1:5173/. The development and preview servers bind to localhost only. `.npmrc` keeps the npm cache inside this project; generated application, browser and TypeScript files also stay here. No global installation or configuration changes are needed. The optional npm audit request stalled in this environment, so dependency installation used `--no-audit`; no security-audit result is claimed.

## Checks

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

T8 browser automation builds the current application into `.tmp/e2e-build`, starts an isolated localhost preview server on port 4173, and tests Chromium, Firefox and WebKit:

```powershell
npm.cmd run test:e2e:install
npm.cmd run test:e2e
```

The wrapper always sets project-local browser-download and temporary paths. Browser binaries, profiles, traces, screenshots and JSON reports remain under `.tmp`; no global browser installation is needed. Use `npm.cmd run test:e2e -- --project chromium --grep T7` for the accessibility/mobile gate. Restricted agent environments may require permission to launch and clean up child processes. Keep ports 4173 and 5173 free for isolated checks.

Screenshots cover all five settled positions in every engine and are compared byte-for-byte within the same run. They are evidence of stable rendering, not approved visual-regression baselines. Native pointer tests use a 2px margin around band boundaries because Firefox/WebKit truncate mouse coordinates to whole CSS pixels; unit tests retain exact inclusive-edge coverage.

With the development server running, the following uses an already installed Chrome or Edge, puts its profile in `.tmp`, checks static layout and asset loading, scans alpha and writes evidence under `docs`:

```powershell
node scripts/verify-static.mjs
node scripts/verify-static.mjs --interactions
```

The first command checks assets, layout, hub projection across all five angles and 1×/2× display density. `--pointer` runs the T4/T5 browser smoke checks; `--interactions` includes T6 native keyboard/button checks. These legacy tools use installed Chrome or Edge with a project-local profile and produce evidence in `docs`. Playwright is the current T8 automation. Protocol-generated touch does not replace physical-device testing. Restricted agent environments may require sandbox permission to launch Chrome.

## Files and evidence

- `src/features/wheel-navigation/`: controller hook, composition, centralized section configuration, pure mechanics, calibration and tests.
- `vitest.config.ts`: Node mathematical tests and jsdom integration tests, with project-local cache. `npm.cmd test` runs once without watch mode.
- `src/assets/`: original neutral wheel, supplied transparent candidate and four original Figma SVG assets. Both PNGs are preserved unchanged.
- `docs/home-desktop.png`, `docs/home-mobile.png`, `docs/home-short.png`: inspected captures.
- `docs/asset-inspection.png`: white/magenta composites and temporary rotation/rim overlays, never used as app artwork.
- `docs/static-verification.json`: browser measurements and alpha scan.
- `docs/pointer-verification.json`, `docs/settled-*.png`: interaction results and all five settled states.

The project already has a local Git repository on `main`. Existing uncommitted changes are preserved. No commit, remote change, push, publication or deployment was performed during T7/T8.

Targeted pointer corrections and remaining known audit issues: [verification record](docs/POINTER_CORRECTIONS.md).

Latest interior-area revision: [validation record](docs/INTERIOR_DRAG.md).

Current visible-edge band and checkpoint: [verification record](docs/VISIBLE_EDGE_BAND.md). Earlier circle/ring reports are historical.

With the build in `.tmp/audit-build`, run `node scripts/verify-wheel-band.mjs` to test the band in temporary Chrome without a development server. `--calibrate` regenerates the source contour from the unchanged artwork loaded by that build; do not regenerate it for unrelated changes.
