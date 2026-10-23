# T2–T6 implementation report — 2026-10-23

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
