# Race Start introduction — implemented contract

**Implemented in the local working tree; validation is incomplete.** This document retains the user's final requirements that replaced the earlier startup proposal. The feature exists in `RaceStartOverlay.tsx`, App and the shared streak module. Keep it small. The latest [timing and validation report](RACE_START_TIMING.md), dated 2026-10-26, records 149 unit/integration passes, successful TypeScript/lint/build, and 35 Race Start/cinematic browser passes with one capability skip in Chromium/WebKit. Firefox failed before application load, leaving current Firefox application behavior unverified. No application checks were rerun for this documentation update; physical-device, native Safari, screen-reader and final visual review remain pending.

## 1. Final feature behavior

Display a full-screen overlay using HOME's existing carbon background (`#101114`) and graphite/silver atmosphere. Reuse its styles and existing atmosphere assets. Build the five-column light assembly and housing with CSS; add no image assets or audio.

| Time from overlay mount | Lights | Button |
|---|---|---|
| 0 seconds | First column red | Hidden |
| 1 second | First two columns red | Hidden |
| 2 seconds | First three columns red | Hidden |
| 3 seconds | First four red; fifth OFF | Show floating `PRESS TO START` |
| Waiting for the visitor | First four stay red; fifth stays OFF | Enabled, subtle pulse |
| Accepted START | Fifth turns red immediately; all five illuminated | Immediately disabled |

START begins the cinematic acceleration without another countdown or an extra fifth-light hold. Reveal the normal HOME at index 2 and exactly 0°, with the track aligned and normal interactions enabled. Do not add a lights-out step, call section confirmation, record a section confirmation, enter a portfolio section or change the URL.

Use a native button for mouse, touch, Enter and Space, with visible focus. Focus it when it appears and focus the existing active HOME label after handoff. Keep the underlying application noninteractive while the overlay is visible. Reduced motion preserves the light timing and explicit START, removes the pulse, and replaces acceleration/blur with an approximately 150 ms fade.

## 2. Minimal architecture and persistence

- One `RaceStartOverlay` component owns the lit-column count, starting flag, simple timers and startup animation. A synchronous ref rejects duplicate START actions before React rerenders. No separate startup hook, resource framework or complex state machine.
- `App` owns the intro visibility flag, initialized from the expiration check. Keep the existing HOME and its single wheel controller mounted behind the overlay. Apply `inert` to the underlying application while the intro is visible; preserve the existing cinematic interaction gating after handoff.
- On START: acquire the guard, disable the button, illuminate column five, write the expiration, then run the scoped effect. One idempotent finish callback removes the overlay and temporary animation styles, releases the intro gate and hands focus to HOME.
- Clean up all four light timers on unmount, including Strict Mode remounts. Revert the startup GSAP context on finish/unmount.
- If animation setup throws, finish immediately. Use one short completion fallback slightly beyond the expected effect duration to call the same finish callback if completion never arrives. Clear it on finish/unmount. This only prevents animation failure from trapping HOME; add no resource timeout or retry workflow.

### Fifteen-minute localStorage expiration

Use one key, such as `gt3-race-start-expires-at`, storing an expiration timestamp in milliseconds.

1. On page load, safely read/parse it. Skip the intro only when the value is finite and strictly later than `Date.now()`. Missing, malformed or expired values show the intro.
2. At accepted START activation, write `Date.now() + 15 * 60 * 1000`. Store at activation, not animation completion. An animation failure still releases HOME.
3. Catch storage read/write errors. The intro and HOME must continue functioning without persistence when storage is unavailable.
4. Check expiry on subsequent page loads. Do not reopen the intro during an active visit or refresh the expiry simply because a reload skipped it.

No image-decoding/layout readiness contract, loading percentage, pre-React shell, native boot watchdog, new dependency or global state store is needed. The one-second steps are presentation timing, independent of network progress.

## 3. Existing cinematic effect reuse

Share the current six streak positions and three GSAP streak tweens from `CinematicLayer.tsx` and `useCinematicTransition.ts` through one small `speedStreaks.ts` module. Both flows use the same streak classes and pass their own scoped elements/timeline to the helper. This shares concrete effect configuration and animation code without introducing a generic transition framework.

Replace only the equivalent literal configuration/tween block in normal navigation. Preserve its destination handling, wheel carrier, dock, entry/return timings, cancellation and focus restoration. Do not call `enter('home')` or reverse the wheel-to-section timeline for startup.

The intro owns a small reveal timeline using the shared streak timing/easing and an overlapping final overlay fade of about 250 ms. Add no further fixed wait. Animate intro-owned elements only; do not rotate/scale the wheel or compete with navigation styles. Every finish path removes the intro effects and interaction gate.

## 4. Implemented file responsibilities

These files now implement the feature and its tests. This documentation update changes no application files. The original file-level requirements below are retained.

| File | Purpose |
|---|---|
| New `src/features/race-start/RaceStartOverlay.tsx` | Assembly, button, local timers/state, activation guard, storage write and scoped reveal. |
| `src/App.tsx` | Safe expiration read, overlay visibility, underlying app inert gate and HOME focus handoff. |
| `src/styles.css` | HOME-matching background/atmosphere, CSS housing/lights, floating button, focus and reduced motion. |
| New `src/features/cinematic-transition/speedStreaks.ts` | Shared existing streak positions and GSAP tween helper. |
| `src/features/cinematic-transition/CinematicLayer.tsx` | Read shared positions; keep navigation decoration unchanged. |
| `src/features/cinematic-transition/useCinematicTransition.ts` | Call the shared streak helper without changing navigation behavior. |
| New `src/features/race-start/__tests__/RaceStartOverlay.test.tsx` | Focused timing, activation, persistence, motion and cleanup tests. |
| New `tests/race-start.spec.ts` | Intro, expiration bypass and HOME handoff browser tests. |
| `tests/wheel-navigation.spec.ts`, `tests/cinematic-transition.spec.ts` | Seed valid expiry for navigation-only setup, including manually created contexts; retain existing assertions. |

No changes to `index.html`, `src/main.tsx`, dependencies, wheel assets, controller, drag calculations, contour geometry, snapping, section mapping or routing.

## 5. Retained implementation sequence

1. Extract the existing streak configuration/tweens with equivalent behavior; verify cinematic navigation.
2. Add the CSS overlay and four cleaned-up timers; verify the fifth stays off and START appears with the fourth.
3. Integrate the expiration check/write and underlying application interaction gate.
4. Connect guarded START to the fifth light, shared acceleration, reduced-motion fade and finish/fallback.
5. Run focused tests and existing regressions; visually review desktop/mobile atmosphere and HOME handoff. Keep work local, without commits unless separately requested.

## 6. Acceptance criteria

- Five CSS light columns over the same HOME background/atmosphere; no new images, fonts, libraries or automatic sound.
- Columns one through four activate at 0/1/2/3 seconds. The fifth never illuminates automatically.
- At the fourth light, a floating, subtly pulsing native START button appears with mouse/touch/Enter/Space support and visible focus. Reduced motion removes the pulse.
- One accepted activation disables START, illuminates column five, writes the 15-minute expiry once and starts one cinematic effect.
- Valid expiry skips directly to HOME. Expired/malformed/unavailable storage permits the normal intro. Skipping does not extend the expiry.
- HOME is noninteractive beneath the intro. After normal completion or animation failure, HOME is accessible at 0° with no overlay, active intro timers or residual animation styles. START never confirms a section.
- Existing wheel mechanics, keyboard accessibility and cinematic navigation remain unchanged. No resource-management system is introduced.

## 7. Focused testing strategy

- **Component/integration:** fake timers for the four steps, indefinite four-light wait, fifth activation, duplicate input, cleanup and Strict Mode. Freeze time to verify expiry exactly 900,000 ms after activation and the expiry boundary. Cover absent/malformed storage and throwing read/write calls.
- **Animation/focus:** one activation, completion cleanup, thrown or missing animation completion releasing HOME, reduced motion, and no Enter/Space click-through into section confirmation.
- **Browser:** desktop/mobile first visit, reload within 15 minutes, expired timestamp, fifth off until activation, keyboard/touch, inert controls, HOME at 0° and subsequent section entry/return.
- **Regression/manual:** existing TypeScript, lint, unit/integration and browser checks; retain navigation assertions. Review the atmosphere, light appearance and reduced-motion presentation, and confirm no new asset downloads.

These remain acceptance and regression criteria. Recorded executions and limitations are in [the latest validation report](RACE_START_TIMING.md); not every criterion has current cross-browser or physical-device evidence. No application tests were rerun for this documentation-only revision.

## 8. Blocking questions and remaining risks

**No blocking technical questions remain.** Product behavior, one-second cadence and 15-minute localStorage persistence are defined.

The focused risks are shared-effect regressions, duplicate activation, stale timers and focus/inert cleanup. Very slow image delivery may outlast the introduction because it does not gate on resources. Storage availability or device-clock changes can affect repeat-visit behavior; neither must prevent access to HOME.

The feature is implemented; further housing, timing or behavior changes require separate approval. Visual review remains pending. The existing START entrance is 600ms before the 2s pulse; it stays enabled during entrance. The startup timeline is approximately 1.5s with an overlapping 250ms fade, and reduced motion uses 150ms. See the timing report for measurements and their limits.
