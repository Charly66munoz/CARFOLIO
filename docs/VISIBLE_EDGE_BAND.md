# Visible-edge interior band

> Historical 11px verification record. The user subsequently approved a 45px maximum inset. Current geometry, T7 fixes, cross-browser results and remaining manual checks are documented in [T7/T8 validation](T7_T8_VALIDATION.md). The original results below are retained as historical evidence.

This revision replaces the broad circular region and supersedes previous ring/circle geometry records. Only the drag-initiation region, its cursor eligibility, test fixtures, instructions and documentation changed. The existing compact focus badge is retained; no visible band, stroke or overlay was added.

## Verified checkpoint

Before editing, created `.checkpoints/before-visible-edge-band-20261023-154630.zip` with source, artwork, configuration, package lock and documentation (51 files). Dependencies, caches, generated build output, secrets, Git internals and previous checkpoints are excluded. ZIP CRC checks and every archived file's SHA-256 were verified, then reverified after implementation. Its adjacent JSON records the complete file manifest.

Archive SHA-256: `df0ab5b7bf4b3c2371742a1c13084ce6282dd5cc8caad82d519d4cb8fa2d67d4`.

The project already had a local Git repository on main, initially clean at e7ebd46. No Git repository was initialized, no history changed, and no commit or remote action was performed. `.checkpoints/` is now ignored to keep the backup local.

## Geometry and behavior

The unchanged transparent candidate is calibrated into a fixed 360-vertex polygon from the outer alpha-128 silhouette, sampled every degree with bilinear alpha interpolation and a binary-searched crossing. Interior openings are ignored. Calibration is tied to asset SHA-256 `8f64d15a8a90214184d38403d7163ece82ddd4621e7f3455e921781996e659bd`.

`wheelHitTest.ts` inversely rotates and scales pointer coordinates into source space around the calibrated hub, determines polygon containment, and measures shortest distance to its segments. Eligible depth is 1 through 11 CSS pixels, inclusive. Insets are configurable in `presentation.ts`; 0.0001 CSS px absorbs browser event-coordinate rounding at exact endpoints. The contour is a calibrated raster approximation, not a mathematically exact photographic edge. No runtime canvas reads or new dependencies are used.

Pointer-down and hover use the same helper and displayed angle. The hub is explicitly excluded. `getHubRadius` is independent of band depth, preserving continued captured movement outside the band and freezing/rebasing only within the hub. Release over the hub following a captured drag does not confirm; a separate hub click confirms normally. Direction, limits, snapping implementation, keyboard commands, ENTER layout/handlers and artwork remain unchanged.

## Files changed

- `.gitignore`: exclude project-local checkpoints.
- `presentation.ts`, new `wheelContour.ts`, new `wheelHitTest.ts`, and `useWheelNavigation.ts`: configuration, fixed calibration, shared hit test and independent hub guard.
- `SteeringWheelNavigator.tsx`: interaction help text only.
- `presentation.test.ts`, `SteeringWheelNavigator.test.tsx`: geometry assertions and valid band-based gesture fixtures.
- New `scripts/verify-wheel-band.mjs`; updated `scripts/verify-static.mjs` to remove obsolete circle geometry.
- README, PROJECT_CONTEXT, IMPLEMENTATION_PLAN and this record.

An unrelated `src/App.tsx` header class edit appeared during the work and was left untouched.

## Actual checks

- 124 tests passed across 3 files. Geometry cases cover insets 1/3/8/11, outside/too-deep rejection, eight contour segments, five wheel positions, sizes 273/400/526, hub exclusion and source-to-screen transforms. Existing controller, cancellation, interruption, snapping and confirmation regressions also passed.
- ESLint passed with zero warnings. TypeScript and Vite production build passed; output was restricted to `.tmp/audit-build`, preserving `dist`. `git diff --check` passed.
- `node scripts/verify-wheel-band.mjs` passed 4,844 assertions in temporary headless Chrome. It loads intercepted local build files without starting a development server. The matrix covers actual mouse presses at eight locations, five wheel positions, viewport widths 1440/320, DPR 1/2, and depths -1/1/3/8/11/12 CSS px. It verifies cursor eligibility and captured pointer initiation separately.
- Real mouse tests also verify smooth movement outside the band, release over the hub without confirmation, PROJECTS snapping, both rotation limits, capture release, and separate hub confirmation. Protocol touch initiation/cancellation passed. Compact keyboard focus and absence of the large circumference passed; the keyboard screenshot was visually inspected.
- Browser evidence and screenshot: `.tmp/wheel-band-verification/results.json` and `keyboard-focus.png`. Run the new verifier with `.tmp/audit-build` present. `--calibrate` explicitly regenerates the source contour from the asset loaded by the build; it is not needed for normal verification.
- Both artwork hashes remain identical to the verified checkpoint. No packages were installed; no test server was started; no source was published or deployed.

## Remaining issues and limits

The known ENTER proximity remains: at desktop HOME, a test press 1px outside the lower contour lands directly on ENTER HOME. That input is rejected for dragging but retains the button's native confirmation behavior. These two DPR-specific matrix cases are recorded separately as `externalControlHits`; every accepted band press preserves confirmation. ENTER layout and behavior were deliberately not changed.

The auxiliary-arrow endpoint focus-loss finding remains unresolved. Physical touch hardware, Firefox, Safari/WebKit and screen-reader validation remain pending. Earlier reports claiming circle geometry are historical, not the current interaction contract.
