# T2–T6 implementation report — 2026-10-23

> Historical delivery record (2026-10-23), consolidated on 2026-10-26. The circle/ring geometries and “not yet implemented” statements below describe their original checkpoints only. Current initiation uses the calibrated 1–45 CSS-pixel contour band. T7 resolved endpoint focus and desktop control overlap; see [T7/T8 validation](T7_T8_VALIDATION.md). Cinematic placeholders and Race Start were implemented later; see [cinematic evidence](CINEMATIC_PROTOTYPE.md) and [Race Start timing and validation](RACE_START_TIMING.md). The runtime artwork is now WebP; original PNG evidence remains historical, with alpha equivalence recorded in [the health audit](APPLICATION_HEALTH_AUDIT.md).

## Completed work

The user explicitly authorized resolving T2 and implementing T4, T5 and T6 sequentially without approval between tasks. The stages were implemented and checked in that order. T3's existing configuration and mathematical helpers were reused unchanged.

| Task | Delivered behavior and gate result |
|---|---|
| T2 | **Pass for the local prototype.** Transparent candidate copied out of `dist` before building; original preserved. Fixed source hub, matched visible scale, stationary lighting/shadow and independent invisible 7px circular drag-initiation boundary. See `T2_ASSET_VALIDATION.md`. |
| T4 | **Pass with physical-device verification pending.** Native Pointer Events support primary mouse/touch, rim-only initiation, 6px threshold, capture outside the initial boundary, incremental clamping, branch normalization, center freezing/rebasing, final release sampling and cancellation rollback. |
| T5 | **Pass.** One GSAP tween owns the angle: 240ms, `power2.out`, no inertia or overshoot. Release commits the nearest section; wheel and track consume one snapshot. Obsolete callbacks are invalidated. New gestures interrupt at the displayed angle; new commands replace a snap. Resize preserves selection; reduced motion assigns exact targets. |
| T6 | **Pass.** Left/Right, Down/Up, Home/End, Enter, previous/next buttons, labels, center button and explicit ENTER control. Selection and confirmation are separate. A single transaction confirms the latest committed section, finishes its snap and calls `onConfirm(section)` once per accepted activation. Active gestures reject confirmation. No routes or destination pages. |

The approved order and mapping remain ABOUT −36°, CONTACT −18°, HOME 0°, PROJECTS +18°, STACK +36°. Positive rotation remains clockwise and endpoints clamp without wrapping.

The App records confirmation text and an activation count so behavior is reviewable. An inactive label selects; a subsequent activation of the committed label confirms. A browser click following a rim gesture has no confirmation handler. Native buttons keep native activation; repeated Enter is suppressed without a duplicate container key handler.

## Files created or modified

**Application**

- Added `src/assets/steering-wheel-transparent-candidate.png`; retained `src/assets/steering-wheel-neutral.png` unchanged.
- Added `src/features/wheel-navigation/useWheelNavigation.ts` for the controller snapshot, synchronous values, pointer bookkeeping, frame coalescing, single tween and confirmation transaction.
- Updated `presentation.ts`, `SteeringWheel.tsx`, `SteeringWheelNavigator.tsx` and `HorizontalSectionTrack.tsx` inside `src/features/wheel-navigation/`.
- Updated `src/App.tsx` and `src/styles.css` for confirmation feedback, responsive controls, focus and pointer affordances.

**Checks and tooling**

- Added `src/features/wheel-navigation/__tests__/presentation.test.ts` and `SteeringWheelNavigator.test.tsx`.
- Updated `vitest.config.ts`, `package.json` and `package-lock.json`; local Testing Library and jsdom dependencies support integration tests.
- Extended `scripts/verify-static.mjs` with T2 calibration and T4–T6 native Chrome input checks, using the existing installed browser and no new browser automation library.

**Documentation and evidence**

- Updated `PROJECT_CONTEXT.md`, `IMPLEMENTATION_PLAN.md`, `README.md` and `docs/T2_ASSET_VALIDATION.md` to reflect current authorization and outcomes.
- Added this report and `docs/pointer-verification.json`; refreshed `docs/static-verification.json`.
- Refreshed `docs/home-desktop.png`, `home-mobile.png`, `home-short.png` and `asset-inspection.png`.
- Added five `docs/settled-*.png` captures for −36°, −18°, 0°, +18° and +36°.

The section-angle configuration and original 86-case mathematical test file were not changed in this delivery.

## Checks actually executed

| Check | Result |
|---|---|
| `npm.cmd test` | **123 tests passed across 3 files.** Includes the original 86 mathematical cases, 3 independent-boundary cases and 34 controller/component cases. |
| `npm.cmd run typecheck` | Passed. |
| `npm.cmd run lint` | Passed, zero warnings. |
| `npm.cmd run build` | Passed; production bundle generated with Vite 8.3.5. |
| `node scripts/verify-static.mjs` | Passed in installed Chrome: asset loading/alpha, white/magenta composites, desktop/mobile/short-screen layout, independently measured hub projection at all five angles and display densities 1/2, actual circle bounds and 7px width. |
| `node scripts/verify-static.mjs --pointer` | Passed during T4, then again with real GSAP during T5. |
| `node scripts/verify-static.mjs --interactions` | Passed after T6 and final focus/layout fixes; no runtime exceptions. |
| Source asset checksums | Original and copied candidate match their recorded, distinct hashes. |
| Local Git | `git status --short` reports no Git repository. None was initialized. |

Automated integration scenarios cover Strict Mode, no-jump grabs, threshold/invalid initiation, release before a frame flush, both directions/limits, extra pointers, outside-circle movement, center exclusion/rebasing, pointer cancellation, lost capture, Escape, blur, hiding, geometry change, cleanup, snap interruption, stale callbacks, reduced-motion changes, rapid selection, label focus/Tab stops, endpoint keys, active-gesture rejection, repeated Enter, native button paths and confirmation during settling.

The integration suite uses a controlled GSAP mock to exercise timing and obsolete callbacks deterministically. The Chrome checks separately exercise the installed real GSAP implementation.

Chrome checks use actual browser mouse input and Pointer Events, plus protocol-generated touch. Mouse capture/release outside the boundary and clockwise/counterclockwise rotation passed. A dispatched `pointercancel` is explicitly synthetic; protocol touch cancellation was also checked. Physical-device input is not claimed.

All five real-browser settled states reached their exact configured angles; the final measured **track-center error was 0 CSS pixels** in every state. Confirmation during settling finishes the committed target, produces one callback, and leaves the URL unchanged. Selection, drag release and snap completion did not confirm. Native Enter on the center button confirmed once, repeated Enter was ignored, and a captured gesture rejected Enter. A 320px check had no horizontal document overflow and resize preserved selection.

An early browser test exposed incorrect held-button representation in the inspection script's DevTools input. The script was fixed and the full checks rerun successfully. Native Enter checking also includes the character event needed for actual browser button activation. No input workaround or synthetic confirmation handler was added to the app.

## Remaining issues

**Functional blockers:** none found in the implemented T2–T6 scope.

**Minor visual refinements:** the supplied candidate has a tighter crop, sharper/different markings and minor material/edge differences; the user authorized these temporarily. Its material alpha is mostly 253 rather than 255; it remains unchanged. Exact font acquisition, final badge/artwork treatment and further mobile art direction remain deferred. The independent circle is intentionally a circular envelope, not a contour following the flattened lower rim. Radius and tolerance can be tuned without changing rotation math.

**Unverified / future checks:** physical Android/iOS touch, iOS Safari, Firefox, WebKit, screen-reader review and comprehensive T7/T8 coverage. Protocol touch and jsdom are not substitutes for those checks. The seven-pixel band follows the requested starting width; broader usability refinement can follow physical-device testing.

No full portfolio content, routing, cinematic transition, minimized wheel, sound, remote synchronization, push, publication or deployment was implemented. Package caches, temporary files, browser profiles, generated screenshots and build output remain inside `carfolio`. Local Git remains uninitialized.


## Consolidated historical records

The following three records were incorporated in full before their separate files were removed with user approval. Their original findings, verification counts, limitations, changed-file lists and evidence paths are retained. Heading levels alone are adjusted. Paths beginning `.tmp/` are relative to the project root; generated evidence can be overwritten by later runs and is not a durable Git archive. No application checks were rerun for this consolidation.

Chronology: initial pure mathematics → 7px circular boundary → 11px pointer correction → broad 0.37-radius interior → contour-based 11px band → approved 1–45px band and T7/T8 fixes. These geometries must not be combined into a new interaction contract. Question marks in the original pointer record are existing notation damage; the described 1px reference plus 5px tolerance per side yields 11px total width. The current configuration is documented in the primary plan.

### T3 verification — 2026-10-22

T3 pure mechanics is complete following the user's explicit request to start it. It is independent of the unresolved T2 asset gate: no artwork edits, application rotation, drag handlers or animation controller were added. The screen remains the T2 static preview.

#### Delivered files

- `src/features/wheel-navigation/sections.ts`: derives HOME angle, minimum/maximum angles and equal slot step from the existing ordered section definitions. The section-angle pairs remain the single source of truth.
- `src/features/wheel-navigation/wheelMath.ts`: clamping, signed shortest angular delta, screen-coordinate polar angle, incremental rotation, nearest section with ties toward HOME, annular hit testing, fractional index and the approved direct track-position equation.
- `src/features/wheel-navigation/__tests__/wheelMath.test.ts`: numerical acceptance tests.
- `vitest.config.ts`: Node test environment, explicit mathematical-test discovery, project-local cache.
- `tsconfig.node.json`: includes the test-runner configuration in strict type checking.
- `package.json` and `package-lock.json`: Vitest 5.0.5 and `npm.cmd test` (`vitest run`). Installed locally with `.npm-cache` and `.tmp`; no global changes. Existing Node 22.19.0 and Vite 8.3.5 meet [Vitest's documented requirements](https://vitest.dev/guide/).
- `README.md` and `IMPLEMENTATION_PLAN.md`: current authorization, progress, commands and limitations.

#### Checks actually run

| Command | Result |
|---|---|
| `npm.cmd test` | 1 test file, **86 tests passed**, Vitest 5.0.5 |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run lint` | Passed with zero warnings |
| `npm.cmd run build` | Passed, Vite 8.3.5 |
| `git status --short` | Directory is not a Git repository; none initialized |

The tests cover:

- All five exact section IDs/labels/angles and order, HOME index 2 at 0°, and derived limits/step.
- Clamping at both endpoints and continuous interior angles without wrapping.
- Normalization to `(-180°, +180°]`, positive and negative multi-turn inputs, signed zero and both ±180° polar branch crossings.
- Clockwise/right motion toward PROJECTS and STACK, counterclockwise/left motion toward CONTACT and ABOUT, and no jump when the first polar sample matches the grab position.
- Immediate reversal at either limit after overshoot, using each actual previous polar sample. T4 must retain that latest sample in its controller; the pure function itself stores no pointer history.
- Exact mappings, out-of-range nearest sections, all four midpoint ties toward HOME, and values immediately on either side of each midpoint.
- Annular inclusion at both boundaries, center/background/corner exclusion, translated centers, diagonal points, invalid bounds, and 288/400/526-pixel stage sizes.
- Exact and intermediate fractional indices, concrete desktop translation values, centering all five sections at four viewport/slot combinations, continuous positions between labels and recalculation after resize.

#### Remaining issues and scope

The original asset SHA-256 remains `568172172d2fe8807b03a0c5f171dff5ef33f0187dc45ef77ed4d0785f077872`, matching T2. The opaque disc, baked lighting and hub/rim calibration remain unresolved. The annulus helper accepts supplied measured radii; its tests certify the mathematical bounds only. Provisional ratios and the candidate hub in `presentation.ts` remain unchanged and unapproved for actual interaction.

The helpers are not yet wired into React controls. This phase does not claim browser drag behavior, pointer capture, functional snapping, visual hub stability, accessible slider operation or live wheel/track synchronization. Those depend on later tasks and applicable acceptance gates. No new browser or physical-device tests were run for these pure calculations. T4–T8 have not started.

All changed files and generated artifacts remain inside `carfolio`. No remote, publication, deployment or Git changes were made.


### Targeted pointer corrections ? 2026-10-23

Only the two user-authorized corrections were applied. This record supersedes earlier 7px boundary descriptions; older verification artifacts remain historical evidence.

#### Changes

- `presentation.ts`: configurable tolerance changed from 3 to 5 CSS pixels per side. The existing 1px reference at radius `0.425 ? stage width` yields an 11px total band (radius ?5.5px). Tolerance stays fixed in CSS pixels as the reference radius scales.
- `SteeringWheel.tsx`: presentation-only capture handlers mark pointer input before eligibility testing, including excluded interior presses, and clear the marker for keyboard input or blur.
- `styles.css`: suppress the center button's focus outline only while marked as pointer input. The slider's existing scoped focus-visible treatment and all other keyboard focus styles remain.
- Updated the boundary unit cases and static inspection script to use 11px. README and current reference descriptions reflect the new tolerance.

#### Exact outline source

Before the correction, `.wheel-surface:focus-visible:not([data-input='pointer'])` rendered a solid 2px silver circle. The controller only marked eligible rim presses as pointer input. In Chrome, keyboard focus followed by an excluded interior click retained focus-visible without that marker. This was reproduced on the previous build. Marking pointer input in the presentation capture phase fixes the cause without changing drag eligibility or keyboard navigation commands.

#### Verification

- `npm.cmd test`: 123 tests passed; includes mathematical, controller, selection, snapping and explicit-confirmation regression cases. Final run also includes expanded-band ?5px acceptance and ?6px rejection assertions.
- `npm.cmd run lint`: passed, zero warnings.
- Production build plus TypeScript passed with output restricted to `.tmp/audit-build`; existing `dist` and both source PNGs were preserved.
- Temporary headless Chrome loaded intercepted local build files; no development server was started. The browser profile and evidence remain under `.tmp`.
- 96 browser assertions passed: real mouse initiation at radius ?5 CSS px and rejection at ?6, widths 1440/320 and DPR 1/2; continuous angle samples at 5/10/15/20 degrees while outside the initiation band; PROJECTS snapping; no gesture confirmation; limits ?36 degrees; pointer outline suppression after keyboard focus; visible Tab focus restoration and Enter confirmation; protocol touch initiation and outline suppression.
- Browser evidence: `.tmp/audit-evidence/pointer-corrections.json` and `pointer-corrections.png`; harness: `.tmp/boundary-browser.mjs`. Protocol touch does not establish physical-device behavior. An initial harness run represented held mouse moves incorrectly; after correcting that and its expected reset target, the complete assertion set passed.

#### Known issues deliberately left open

1. Desktop instructions/auxiliary controls overlap the lower independent initiation circle. A gesture attempted there can hit ENTER instead. This correction neither changes ENTER layout/confirmation nor claims the overlap is fixed.
2. Reaching an endpoint through a focused auxiliary arrow can disable that button and move browser focus to body. Keyboard command logic is unchanged; this remains a documented audit finding, not a claimed fix.
3. Physical touch devices, Firefox, Safari/WebKit and screen-reader validation remain pending.

No artwork, section mapping, snapping implementation, navigation architecture or auxiliary control layout was changed. No dependencies were installed; no Git repository was initialized, and no remote action was performed.


### Broad interior drag region

This user-authorized revision supersedes the 7px/11px perimeter ring and its earlier verification records.

The region is a simple stationary circle of radius 0.37 times stage width, excluding a hub of radius max(44px, 0.22 times stage width) / 2. Runtime hit testing reuses the existing radial helper; there is no image-alpha lookup or new hit-testing abstraction. Spokes, controls, rim and openings within this circle accept initiation. The hub remains the existing sibling confirmation button. Ongoing gestures freeze/rebase only inside that hub, so presses on nearby spokes respond immediately. Pointer capture, snap code, limits, section mapping, keyboard commands and artwork are preserved.

The radius deliberately fits inside the flattened wheel rather than extending to its topmost edge. Independent browser canvas measurements over 360 directions found a minimum visible outer radius of 0.37880 times stage width, enclosing the 0.37 circle across rotations. Some outermost material is outside the inscribed circle by design.

The large white/silver circumference came from the wheel slider CSS focus-visible outline, not the image, SVG shadow or a border. The drag surface now has no outline even under keyboard focus. A small keyboard-only ARROW KEYS TO SELECT badge provides visible focus instead; other controls retain their focus-visible styles. Pointer presses hide the badge. Decorative instruction text ignores pointer events so it cannot intercept the lower interior; ENTER layout and handlers were not moved or modified.

Changed files: presentation.ts, useWheelNavigation.ts, SteeringWheelNavigator.tsx (help text only), styles.css, presentation.test.ts, SteeringWheelNavigator.test.tsx (gesture fixture radius), scripts/verify-static.mjs, README.md, PROJECT_CONTEXT.md, IMPLEMENTATION_PLAN.md, and this record.

Validation: 123 automated tests passed, lint passed with zero warnings, TypeScript and production build passed. The build was written to .tmp/audit-build without overwriting dist. Temporary Chrome loaded intercepted build files without starting a development server. 243 browser assertions passed at widths 1440/320 and DPR 1/2: five initiation points per size/density, including spokes and controls; continued movement outside the circle; exact PROJECTS snapping; no drag confirmation; outside-wheel rejection; hub confirmation; no circumference on press, movement, release or keyboard focus; compact focus badge present. The keyboard-focus screenshot was visually inspected. Evidence: .tmp/audit-evidence/interior-drag.json and interior-keyboard.png; harness: .tmp/interior-browser.mjs.

Known issues: auxiliary-arrow endpoint focus loss remains unresolved and keyboard navigation code was not changed. The previous outer-ring/control-overlap finding is retained as historical audit evidence; this revision replaces that ring and makes no claim to have repaired ENTER layout. Physical-device, Firefox, Safari/WebKit and screen-reader validation remain pending. No package installation, Git initialization, remote action or deployment occurred.
