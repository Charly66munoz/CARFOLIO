# Carfolio

Local interactive portfolio prototype for Agustín López, using React, Vite, strict TypeScript, Tailwind CSS, native Pointer Events and GSAP.

## Implemented functionality and design scope

- Steering navigation: ABOUT −36°, CONTACT −18°, HOME 0°, PROJECTS +18°, STACK +36°. Positive rotation is clockwise; endpoints clamp. Selecting never automatically confirms.
- Calibrated 1–45 CSS-pixel contour band, captured dragging, cancellation, one GSAP snap, synchronized track, keyboard/native-button alternatives and explicit confirmation.
- Cinematic entry into four placeholder sections and floating-wheel restoration; HOME remains navigation. Escape reverses entry; reduced motion uses a short fade.
- Race Start introduction: 0/1/2/3s lights, explicit START/fifth light, 600ms button entrance, shared streak reveal and 15-minute expiry. HOME stays mounted behind the intro gate; START does not confirm a section.

**HOME remains unchanged unless explicitly requested.** Engineering Dossier is the approved visual direction for internal sections only. The specific ABOUT layout is under design review and has not been implemented; ABOUT currently renders a placeholder. Design discussions do not authorize implementation. Real content/contact destinations, full routing, sound, final artwork/font treatment, full responsive art direction and publishing require separate approval.

## Verification status

The latest available [Race Start timing/validation report](docs/RACE_START_TIMING.md), dated 2026-10-26, records 149 unit/integration passes, passing TypeScript/lint/build, and 35 Race Start/cinematic browser passes with one capability skip in Chromium/WebKit. Firefox failed before application load; current Firefox behavior remains unverified. These are existing reported results, not tests rerun during this documentation cleanup or a full current mechanical browser sweep.

Historical evidence remains separate: [T1–T6 and consolidated records](docs/T2_T6_IMPLEMENTATION.md), [asset validation](docs/T2_ASSET_VALIDATION.md), [T7/T8](docs/T7_T8_VALIDATION.md) (127 tests, 43 browser passes, two skips), [cinematic implementation/review](docs/CINEMATIC_PROTOTYPE.md) (130 tests and final targeted 39 browser passes), and [health audit](docs/APPLICATION_HEALTH_AUDIT.md) (70 browser passes and two skips across completed pre-Race Start executions). Historical circle/ring geometries and branch/status snapshots are not current contracts.

Physical Android/iOS, native Safari, NVDA/VoiceOver, actual-device fluidity and final cinematic aesthetic review remain pending. Missing-artwork/JavaScript recovery, long-session heap attribution and standalone CDP verifier transport reliability remain limitations. No external dependency vulnerability-audit result is claimed.

Operational rules are in [AGENTS.md](AGENTS.md), product requirements in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), and contracts/progress/future gates in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). The [Race Start contract](docs/RACE_START_IMPLEMENTATION_PLAN.md) preserves its final requirements and incomplete validation status.

Drag within the invisible band 1 to 45 CSS pixels inside the visible wheel rim. The band follows the artwork as it rotates; the central hub remains reserved for confirmation. Use Left/Right (also Down/Up), previous/next buttons or section labels as alternatives. Home key selects ABOUT; End selects STACK. Enter, the wheel center, the active label or the ENTER button confirms. An inactive label selects on the first activation and confirms on a later activation. The current prototype transitions to placeholder content after confirmation; HOME stays in navigation.

The configurable band insets and hub size are in `src/features/wheel-navigation/presentation.ts`. The fixed contour is calibrated from the unchanged transparent asset; runtime hit testing follows its scale, hub and rotation. Keyboard focus retains the compact badge. Only the artwork rotates; lighting, shadow and interaction surface stay fixed.

The approved 1–45px band, section mapping, artwork and steering mechanics are preserved. Endpoint arrows remain focusable with `aria-disabled` at their limits; activating a limited arrow does nothing, and the opposite arrow key can immediately reverse direction. Confirmation controls are below the desktop wheel surface. Historical circle/ring and 11px reports do not describe the current geometry.

## Run locally

Historical tooling baseline: Node 22.19.0 and npm 10.9.3 on Windows. Commands below are for authorized local development; they do not authorize an agent to install dependencies or manage servers during documentation work. Use `npm.cmd` in PowerShell where script execution policy blocks `npm.ps1`.

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

Historically, the first command checked assets, layout, hub projection across all five angles and 1×/2× display density. `--pointer` runs the T4/T5 browser smoke checks; `--interactions` includes T6 native keyboard/button checks. These legacy tools use installed Chrome or Edge with a project-local profile and produce evidence in `docs`. Their current compatibility with the intro gate has not been established by this documentation task. Playwright is the current T8 automation. Protocol-generated touch does not replace physical-device testing. Restricted agent environments may require sandbox permission to launch Chrome.

## Files and evidence

- `src/features/wheel-navigation/`: controller hook, composition, centralized section configuration, pure mechanics, calibration and tests.
- `vitest.config.ts`: Node mathematical tests and jsdom integration tests, with project-local cache. `npm.cmd test` runs once without watch mode.
- `src/assets/`: original neutral wheel, supplied transparent candidate and four original Figma SVG assets. Both PNGs are preserved unchanged; `WheelArtwork.tsx` imports the WebP derivative. The health audit records identical decoded alpha and the contour checksum update without recalibration.
- `docs/home-desktop.png`, `docs/home-mobile.png`, `docs/home-short.png`: inspected captures.
- `docs/asset-inspection.png`: white/magenta composites and temporary rotation/rim overlays, never used as app artwork.
- `docs/static-verification.json`: browser measurements and alpha scan.
- `docs/pointer-verification.json`, `docs/settled-*.png`: interaction results and all five settled states.

The current documentation-maintenance checkpoint is on `loading-section`, with pre-existing modified and untracked user work preserved. Historical Git snapshots in evidence reports describe their original tasks. No commit, branch change, remote write, publishing or development-server management is authorized by this cleanup.

The [consolidated historical records](docs/T2_T6_IMPLEMENTATION.md#consolidated-historical-records) retain pure-math verification, pointer-focus diagnosis, intermediate interior geometry, their original results and evidence references. Endpoint focus and desktop control overlap were later resolved in T7/T8.

See [current mechanical verification baseline](docs/T7_T8_VALIDATION.md) and [historical contour calibration/checkpoint](docs/VISIBLE_EDGE_BAND.md). The latter records an earlier 11px maximum inset; the current maximum is 45px.

With an authorized build in `.tmp/audit-build`, `node scripts/verify-wheel-band.mjs` checks the band without a development server. The health audit records a standalone CDP transport failure and a successful temporary adapter run; compatibility is not assumed. `--calibrate` regenerates the contour and must not be used for unrelated changes.
