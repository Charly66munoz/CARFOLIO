# Carfolio

Local steering-wheel portfolio prototype for Agustín López. React, Vite, strict TypeScript, Tailwind CSS and GSAP core. The approved design and mechanical contracts are in `PROJECT_CONTEXT.md` and `IMPLEMENTATION_PLAN.md`.

## Current delivery

- **T1 complete:** application foundation, local tooling, pinned dependencies and lockfile.
- **T2 complete:** authorized transparent candidate, preserved original, fixed hub and independent invisible circular initiation boundary. See [asset validation](docs/T2_ASSET_VALIDATION.md).
- **T3 complete:** independent mathematical helpers and 86 passing Vitest tests. See [T3 verification](docs/T3_VERIFICATION.md). Section angles, limits and step size derive from one configuration. Mathematical hit testing does not certify artwork calibration.
- **T4–T6 complete:** native mouse/touch Pointer Events, capture, cancellation, a single GSAP snap, synchronized horizontal track, keyboard controls and explicit confirmation. The complete suite has 123 passing tests. See [implementation report](docs/T2_T6_IMPLEMENTATION.md).
- T7/T8 comprehensive accessibility, physical-device and cross-browser validation remain future work. The contact labels are reference text until destinations are supplied. No destination pages or routes exist.

Drag most of the wheel interior, including spokes and controls. The invisible circular region stays within the artwork; its central hub is reserved for confirmation. Use Left/Right (also Down/Up), previous/next buttons or section labels as alternatives. Home key selects ABOUT; End selects STACK. Enter, the wheel center, the active label or the ENTER button confirms. An inactive label selects on the first activation and confirms on a later activation. Feedback records the confirmed section without navigating.

The adjustable geometry is in `src/features/wheel-navigation/presentation.ts`. The outer drag radius is 0.37 times stage width; the excluded hub matches the center button. Keyboard focus uses a compact text badge. Only the artwork rotates; lighting, shadow and interaction surface stay fixed.

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

With the development server running, the following uses an already installed Chrome or Edge, puts its profile in `.tmp`, checks static layout and asset loading, scans alpha and writes evidence under `docs`:

```powershell
node scripts/verify-static.mjs
node scripts/verify-static.mjs --interactions
```

The first command checks assets, layout, hub projection across all five angles and 1×/2× display density. `--pointer` runs the T4/T5 browser smoke checks; `--interactions` includes T6 native keyboard/button checks. These use installed Chrome or Edge with a project-local profile and produce evidence in `docs`. Protocol-generated touch is not a physical-device test. Comprehensive Firefox/WebKit and accessibility validation remain future work. Restricted agent environments may require sandbox permission to launch Chrome.

## Files and evidence

- `src/features/wheel-navigation/`: controller hook, composition, centralized section configuration, pure mechanics, calibration and tests.
- `vitest.config.ts`: Node mathematical tests and jsdom integration tests, with project-local cache. `npm.cmd test` runs once without watch mode.
- `src/assets/`: original neutral wheel, supplied transparent candidate and four original Figma SVG assets. Both PNGs are preserved unchanged.
- `docs/home-desktop.png`, `docs/home-mobile.png`, `docs/home-short.png`: inspected captures.
- `docs/asset-inspection.png`: white/magenta composites and temporary rotation/rim overlays, never used as app artwork.
- `docs/static-verification.json`: browser measurements and alpha scan.
- `docs/pointer-verification.json`, `docs/settled-*.png`: interaction results and all five settled states.

The reference documents have been updated to reflect the user's current geometry decisions, explicit authorization and verified progress. No Git repository was initialized, and nothing has been published.

Targeted pointer corrections and remaining known audit issues: [verification record](docs/POINTER_CORRECTIONS.md).

Latest interior-area revision: [validation record](docs/INTERIOR_DRAG.md).
