# Implementation Plan — GT3 Portfolio Prototype

## 1. Authority, authorization, and current progress

This document records implemented contracts, historical acceptance gates and remaining work. Read `AGENTS.md`, `PROJECT_CONTEXT.md` and this plan completely before project-specific recommendations or changes. Operational restrictions belong to `AGENTS.md`; product requirements belong to `PROJECT_CONTEXT.md`. Report contradictions rather than silently changing approved requirements. This plan does not authorize implementation.

**Implemented:** T1–T8 steering mechanics and accessibility/mobile baseline; cinematic navigation to four placeholders and floating restoration; Race Start with explicit activation, 15-minute expiry and HOME handoff. Full section content and routes are absent. HOME, calibrated mechanics and cinematic behavior remain protected.

**Design only:** Engineering Dossier is the approved direction for internal sections. The specific ABOUT layout remains under review and is not implemented. Discussion does not authorize implementation.

**Evidence:** Sections 7, 10 and 11 retain original acceptance gates and dated results. The latest available application results are summarized in Section 12; no application tests were rerun during the 2026-10-26 documentation cleanup. A completed automated gate does not imply physical-device validation or aesthetic sign-off.

## 2. Scope and fixed behavior

The local prototype uses React + Vite + TypeScript + Tailwind CSS, native Pointer Events and GSAP for snapping. The following mechanical contracts remain fixed.

Preserve the approved [Figma design](https://www.figma.com/design/oEXjYLVP8tfpWG5PO16x1o), palette, composition, and steering convention. The corrected Figma states and `PROJECT_CONTEXT.md` are consistent.

| Index | Section | Angle | Counter |
|---:|---|---:|---|
| 0 | ABOUT | −36° | 01 / 05 |
| 1 | EXPERIENCE | −18° | 02 / 05 |
| 2 | HOME | 0° | 03 / 05 |
| 3 | PROJECTS | +18° | 04 / 05 |
| 4 | STACK | +36° | 05 / 05 |

HOME initializes at 0°. Positive angles rotate clockwise. Selection and rotation never wrap.

Approved interaction contracts:

- Dragging previews the nearest section.
- Release commits that section and begins snapping.
- Activating an inactive label selects it.
- A subsequent activation of the active label confirms.
- Wheel-center activation and Enter also confirm.
- Confirmation is allowed during snapping and resolves the committed section.
- Confirmation is rejected during an active pointer gesture.
- Selection, pointer release, and animation completion never automatically confirm.
- Cancellation restores the gesture-start committed section.

The original T1–T8 delivery excluded cinematic transitions and minimized navigation; the separately approved prototype now includes both (Section 11) and Race Start (Section 12). Actual portfolio pages, routing, sound, backend work, publishing and deployment remain deferred and require separate approval. Basic mobile usability is implemented; full responsive art direction remains future work.

## 3. Compact architecture and state

```text
App
└─ SteeringWheelNavigator
   ├─ HorizontalSectionTrack
   └─ SteeringWheel
```

Supporting code consists of one controller hook, pure mathematical helpers, and centralized section configuration.

| Element | Responsibility |
|---|---|
| `App` | Composition, confirmation feedback, cinematic scenes and Race Start gate |
| `SteeringWheelNavigator` | Composition, instructions, previous/next controls, accessible status |
| `HorizontalSectionTrack` | Labels, counter, underline, horizontal positioning |
| `SteeringWheel` | Stationary interaction surface, rotating artwork, center button |
| `useWheelNavigation` | Pointer lifecycle, state, keyboard commands, snapping, confirmation |
| `wheelMath` | Angles, limits, nearest section, hit testing, track calculation |
| `sections` | Ordered section definitions and derived types |

Keep mechanical pointer/snap logic in the mechanical controller hook. Cinematic state and Race Start remain separately owned as described in Sections 11–12. Introduce no further components, hooks, libraries or architectural layers unless demonstrated complexity requires them. Avoid state-management libraries, generic interpolation utilities, and premature optimization.

### Public contract

```ts
type SectionId =
  | 'about'
  | 'experience'
  | 'home'
  | 'projects'
  | 'stack';

interface SteeringWheelNavigatorProps {
  onConfirm: (section: SectionId) => void;
}
```

The mechanical contract reports explicit confirmation without changing the URL. App now enters non-HOME cinematic placeholders; HOME stays in navigation. Controlled mechanical selection and asynchronous routing remain outside this contract. Race Start expiry is separate from mechanical state.

### Internal state

```ts
type InteractionPhase =
  | 'idle'
  | 'armed'
  | 'dragging'
  | 'settling';

interface NavigationState {
  angleDeg: number;
  selectedIndex: number;
  phase: InteractionPhase;
}
```

Derived values:

```text
previewIndex = nearestSection(angleDeg)

displayIndex =
  previewIndex during armed/dragging
  selectedIndex otherwise

canConfirm =
  no active pointer gesture
  and phase is idle or settling
```

Use one React snapshot. Refs hold synchronous controller values, pointer bookkeeping, pending frame, and tween handle. They must not create independently writable selections.

Central controller operations update refs and React state together, preventing release-followed-by-confirmation from reading stale selection. Publish visual pointer updates at most once per animation frame and flush the final sample before release commitment.

### Confirmation transaction

All confirmation paths call one function:

1. Reject while a pointer gesture is active.
2. Capture the latest committed section.
3. Kill the remaining snap and invalidate obsolete callbacks.
4. Assign that section's exact angle and enter idle.
5. Invoke `onConfirm(capturedSection)` once.

Never invoke confirmation from an effect, state updater, release handler, or animation completion.

Exactly once means once per accepted explicit activation. Later intentional activations may confirm the same section again.

Native buttons use native activation. The wheel slider handles Enter directly. Ignore repeated Enter keydown events and avoid duplicate container handling. An inactive label's activation must not select and then fall through into confirmation during the same event.

## 4. Mechanics and synchronization

### Pointer mathematics

Measure the stationary interaction surface:

```text
cx = rect.left + rect.width / 2
cy = rect.top  + rect.height / 2

pointerAngle =
  atan2(clientY - cy, clientX - cx) × 180 / π
```

Only the artwork rotates. Its visual hub, transform origin, and interaction center coincide. Use one neutral HOME wheel asset instead of switching between five pre-rotated images.

For each accepted sample:

```text
delta = normalizeToSigned180(currentPolar - previousPolar)
nextAngle = clamp(currentAngle + delta, -36, +36)
```

Normalize differences to `(-180°, +180°]`.

Update the previous polar angle even at a limit. Do not accumulate invisible overshoot. Grabbing at any eligible rim position must preserve the current wheel angle.

### Interaction region

The latest approved revision supersedes the broad circle and earlier perimeter rings. A fixed outer-contour polygon is calibrated from the transparent asset (alpha 128, ignoring openings). Transform pointer coordinates into source-image space using the calibrated hub, scale and displayed rotation. Initiation requires an inside point whose shortest distance to the outer polygon is between 1 and 45 CSS pixels, inclusive. Both insets are configurable and remain fixed in CSS pixels across screen sizes.

Use the same eligibility helper for pointer-down and hover. Pointer capture continues beyond the band. Keep the hub radius `max(44px, 0.22 * stage width) / 2` separate from initiation eligibility: ongoing gestures freeze/rebase only inside that hub. No artwork or keyboard-command changes; no visible border. The compact keyboard focus badge remains. See [current mechanical baseline](docs/T7_T8_VALIDATION.md) and [historical contour calibration/checkpoint](docs/VISIBLE_EDGE_BAND.md).

### Pointer lifecycle

- Accept one primary pointer; mouse requires the primary button.
- Capture an eligible pointer and enter `armed`.
- Begin dragging after 6 CSS pixels of displacement from pointer-down.
- Update continuous rotation and preview during dragging.
- Freeze rotation inside the center exclusion region; rebase when exiting.
- Process final pointer-up coordinates before committing selection.
- Release without dragging returns to the committed angle without confirmation.
- Ignore additional pointers.
- Disable native image dragging and text selection on the surface.
- Apply `touch-action: none` only to the wheel interaction surface.

Cancel on `pointercancel`, unexpected capture loss, Escape, blur, document hiding, or geometry changes during a gesture. Restore the gesture-start committed selection.

Clear pointer ownership before releasing capture. Clean up frames, listeners, and tweens on unmount. Finish an existing snap at its committed target when the document becomes hidden.

Selection commands are ignored while a pointer gesture owns the controller. New selection commands otherwise replace an existing snap.

The rim has no confirmation click handler. A browser click following a drag must not activate confirmation through another control.

### Nearest section and snapping

Choose the configured angle with minimum absolute distance. Midpoint ties resolve toward HOME:

| Angle | Result |
|---:|---|
| −27° | EXPERIENCE |
| −9° | HOME |
| +9° | HOME |
| +27° | PROJECTS |

Use an explicit comparator rather than implicit rounding.

Snap settings:

- GSAP tween of one numeric angle.
- 240 ms, `power2.out`.
- No velocity projection, inertia, overshoot, or bouncing.
- Completion assigns the exact target.
- Zero-distance snaps complete immediately.
- New dragging interrupts at the displayed angle.
- Confirmation immediately finishes the snap.
- Reduced motion assigns the target immediately.
- Obsolete animation callbacks cannot update current state.

Do not add CSS transitions to rotation or track translation. Only one tween may own the angle.

### Horizontal track

Keep the approved direct calculation:

```text
fractionalIndex = 2 + angleDeg / 18
trackX = viewportWidth / 2
         - (fractionalIndex + 0.5) × slotWidth
```

Use five equal-width slots. Wheel and track consume the same angle snapshot; the track has no independent animation.

Measure dimensions with `ResizeObserver`. Use fixed slot geometry and transform-based text scaling. Derive emphasis directly from each label's distance to the fractional index.

Keep the underline centered. Show preview numbering during dragging and committed numbering after release. Resize recalculates geometry without changing selection.

Do not introduce generic interpolation utilities or additional synchronization abstractions.

## 5. Visual and accessibility requirements

### T2 asset-validation gate — retained acceptance contract

The original neutral HOME wheel from Figma (`5:22` in frame `5:2`) was inspected and retained unchanged. On 2026-10-23 the user supplied and authorized a transparent candidate for the prototype, accepting minor visual differences until final refinement. It was copied from `dist/assets/steering-wheel-neutral-DLpvQqP8.png` to `src/assets/steering-wheel-transparent-candidate.png` before any build, without overwriting the original. The runtime subsequently switched to the WebP derivative; [the health audit](docs/APPLICATION_HEALTH_AUDIT.md) records identical decoded alpha and a checksum-only contour metadata correction without recalibration.

Verify:

- **Transparency:** inspect alpha and composite over contrasting backgrounds. The asset must not introduce an unintended opaque disc or rectangular background.
- **Resolution:** target at least 1052 × 1052 pixels for a maximum 526 CSS-pixel stage, providing sufficient detail at 2× display density.
- **Center:** identify the visual hub and calibrate its placement against the stationary stage center.
- **Origin:** verify rotation about the calibrated hub without visible orbiting.
- **Lighting:** distinguish intrinsic material highlights from baked environmental glow, directional background lighting, or external shadows that would rotate unnaturally.
- **Appearance:** compare the neutral export with the approved HOME reference, preserving proportions, stripe, materials, badge, and visual quality.

Page atmosphere and external shadows remain stationary. Static inspection or temporary visual previews may be used to assess the asset; do not proceed to interactive rotation implementation until the gate passes.

If any limitation is discovered, report the evidence and its effect before proceeding with rotation. Do not automatically remove lighting, cut out the image, regenerate it, substitute artwork, or redesign it. Any corrective artwork change requires authorization.

T2 now passes for the authorized prototype candidate: 1254 × 1254 dimensions, transparent openings and background, approved GT3-inspired identity, calibrated source hub `(625.95594, 645.82089)`, image scale 0.87 and a stationary rotation wrapper. Independent image-derived hub projection through actual CSS transforms moves by at most 0.072 CSS pixels across all five positions. The original image remains unchanged. See `docs/T2_ASSET_VALIDATION.md` for remaining minor artwork refinements.

### Presentation baseline

At 1440 × 900:

- Approximately 526 px square wheel stage.
- 250 px navigation slots.
- Approved palette, spacing, subdued atmosphere, and hierarchy.
- HOME counter normalized to `03 / 05`.

Use the five palette colors from `PROJECT_CONTEXT.md` as shared Tailwind theme tokens.

Responsive baseline:

- Wheel width: `min(526px, viewport width − 32px)`.
- Slot width: `clamp(160px, 17.361vw, 250px)`.
- Track clipping within its viewport.
- Reflow header and instructions.
- Allow vertical scrolling on short screens.
- No page-level horizontal overflow at 320 px width.

Preserve the existing badge for the local prototype. Retain the planned system sans-serif fallback and reference typography treatment; exact font acquisition is deferred.

### Accessibility

- Focusable horizontal slider with index range `0…4` and meaningful `aria-valuetext`.
- Left/Right and Down/Up select previous/next.
- Home selects ABOUT; End selects STACK. Explain that the Home key differs from the HOME section name.
- Enter confirms the committed section.
- Native previous/next and confirmation buttons provide alternatives to dragging; endpoints clamp without wrapping.
- Center button remains a sibling of the slider surface, not its interactive descendant.
- Track labels use native buttons and committed `aria-pressed` state, not `aria-current`.
- Committed label receives the track Tab stop; arrow movement uses `preventScroll`.
- Keyboard handling stays scoped to navigator controls.
- Preserve visible focus and normal Tab behavior.
- Announce commitment and confirmation politely, without frame-by-frame announcements.
- Auxiliary targets are at least 44 × 44 CSS pixels.
- Artwork is decorative to assistive technology.
- Reduced motion removes snapping animation while retaining direct manipulation. No mechanical label pulse is implemented. The later Race Start button pulse is independently scoped and disabled for reduced motion.

## 6. Implemented files and tooling

- `src/features/wheel-navigation/`: centralized sections, mechanical controller/math, calibrated presentation/contour/hit testing, artwork and navigator components, unit/integration tests.
- `src/features/cinematic-transition/`: cinematic controller/layer, shared `speedStreaks.ts`, placeholders and controller tests.
- `src/features/race-start/`: overlay component and component tests; `src/App.tsx` composes the intro gate and cinematic scenes.
- `src/assets/`: preserved original/candidate PNGs, runtime WebP and stationary SVG atmosphere/shadow/indicator.
- `vitest.config.ts`, `playwright.config.ts`, `tests/`, `scripts/playwright.mjs`: local unit/integration and browser tooling.
- `scripts/verify-static.mjs` and `scripts/verify-wheel-band.mjs`: legacy inspection and dedicated contour verifier. The health audit documents a standalone CDP transport failure and an adapter-based successful verification; do not assume every historical command still runs unchanged.

The original tooling sequence was foundation → Vitest mathematics → Testing Library/jsdom → T4 browser smoke → T8 Playwright. Dependencies are local and locked. Future installations require task authorization; no dependency changes are part of documentation maintenance.

Keep caches, temporary files, browser downloads/profiles, builds and reports inside `carfolio`. Bind authorized servers to localhost. Do not manage the development server without explicit authorization; documented commands are not authorization to execute them.

## 7. Historical implementation tasks and retained acceptance gates

| Task | Deliverable | Acceptance criteria |
|---|---|---|
| **T1 — Foundation** | Local application and tooling | Existing documents preserved; local application loads; type check, lint, and production build pass; configured writes stay inside `carfolio`. |
| **T2 — Asset validation and static presentation** | Validated neutral artwork and static components | Transparency, resolution, center, origin, environmental lighting, and appearance checks are recorded. Any limitation is reported before rotation work proceeds. No unauthorized artwork changes occur. Approved order, palette, and initial HOME state are preserved; rim hit region aligns with the visible wheel. |
| **T3 — Pure mechanics** | Configuration and mathematical helpers | Tests pass for angle mapping, limits, branch normalization, midpoint ties, annular hit testing, endpoint reversal, and direct track centering. Section-angle definitions have one source. |
| **T4 — Pointer interaction and early browser check** | Initial dragging, capture, cancellation, preview, release | Grabs cause no jump; clockwise motion increases angle; capture, threshold, center exclusion, extra-pointer rejection, final release sample, and rollback work. A real-browser smoke test verifies capture/release, mouse rotation, cancellation handling, and basic touch where available. Results and unavailable checks are recorded. No gesture confirms. |
| **T5 — Snapping and synchronization** | One GSAP snap and synchronized track | Nearest-angle snapping uses 240 ms deceleration without overshoot; settled labels center within 1 CSS pixel; visual hub remains within 1 CSS pixel across rotations; interruption and stale-callback tests pass; resize preserves selection. |
| **T6 — Confirmation and keyboard controls** | Explicit activation paths | Confirmation during settling resolves the committed section once and finishes motion; active gestures reject it; inactive labels only select; Enter repetition and bubbling cannot duplicate callbacks; selection and animation completion never confirm; URL remains unchanged. |
| **T7 — Accessibility and mobile baseline** | Semantics, focus, alternatives, reduced motion | All sections are selectable without dragging; keyboard endpoints clamp; focus and native controls work; reduced motion settles immediately; 320 px layout has no horizontal page overflow; scrolling outside the wheel works. |
| **T8 — Comprehensive validation and handoff** | Cross-browser automation and documentation | Chromium, Firefox, and WebKit checks cover primary interactions; five settled-state screenshots are captured; physical-device checks are recorded where available; required checks pass; README and final report identify all remaining unverified items. |

The completed phases followed these gates; retain them as regression acceptance criteria for separately authorized work. At each gate, report changed files, checks actually run, results, unresolved issues, and available local Git status.

T3 was completed independently while the original T2 asset decision was pending. The subsequent explicit T2–T6 authorization supersedes that earlier restriction; T2 was validated before implementing T4 and T5, and T5 was verified before T6. Historical circular-region tests certified that former independent boundary. The current contour band uses the later calibration and hit-testing coverage.

### T4 smoke-test procedure

Use the local application in an available real browser:

1. Press the visible rim, drag outside the element, and release. Verify capture keeps the gesture active and release clears ownership.
2. Drag clockwise and counterclockwise. Verify direction, limits, and committed release selection.
3. Exercise cancellation and verify rollback without confirmation.
4. Test basic touch dragging and release on available touch hardware.

When native cancellation cannot be reproduced reliably, dispatch a cancellation event inside the real browser to verify handler behavior and label that result as synthetic. Record native cancellation or physical touch checks as pending when unavailable.

This smoke test requires no new automation library. Comprehensive browser automation was subsequently added in T8; this procedure is historical and does not authorize server management.

## 8. Test strategy and risks

### Priority automated scenarios

**Mathematics**

- Five exact mappings and HOME initialization.
- Both limits and immediate reversal.
- ±180° branch crossing.
- Midpoints and adjacent values.
- Hit testing at different rendered sizes.
- Track centering at valid and intermediate angles.

**Interactions**

- Below-threshold press versus drag.
- Release before a pending frame renders.
- Drag interrupting snapping.
- Rapid selection replacing snapping.
- Cancellation and unexpected capture loss.
- Center exclusion and rebasing.
- Preview differing from committed selection.
- Release committing PROJECTS, followed by confirmation during snapping resolving PROJECTS once.
- Confirmation during an active gesture producing no callback.
- Obsolete animation completion producing no selection change or confirmation.
- Browser click following drag producing no confirmation.
- Enter handling, Strict Mode, and unmount cleanup.
- Reduced-motion changes during snapping, resizing, blur, and document hiding.

T8 added browser coverage, deterministic settled screenshots, responsive checks and real mouse event behavior; results remain specific to that checkpoint. Synthetic touch testing does not substitute for physical-device validation. Review keyboard-only use, screen-reader feedback, Android touch, and iOS Safari where available; report unavailable checks as pending.

### Main risks

| Risk | Mitigation |
|---|---|
| Approved asset unsuitable for rotation | Mandatory T2 gate; report before proceeding; no unauthorized alteration |
| Empty areas accept dragging | Calibrated 1–45px contour band; hub excluded |
| Confirmation reads stale state | Synchronous committed-selection value and one confirmation transaction |
| Duplicate callbacks | Event-handler-only confirmation and single activation path |
| Wheel and track diverge | One angle and the approved direct track equation |
| Center or endpoint jumps | Exclusion/rebasing, normalized deltas, incremental clamping |
| Browser input behavior differs | T4 real-browser smoke check, then T8 comprehensive testing |
| Controller becomes overly complex | Compact initial design; extraction only when demonstrably necessary |
| Frame drops | Coalesce pointer updates, use transforms, cache measured geometry, profile before optimizing |

## 9. Operational boundaries

- Every file operation stays inside `carfolio`.
- Preserve the operational restrictions in `AGENTS.md` and product requirements in `PROJECT_CONTEXT.md`.
- Before significant changes, identify the in-project files to create or modify.
- No global installations or machine/user configuration changes.
- No remote repository creation, remote configuration, push, publishing, deployment, or source synchronization.
- No automatic Git initialization. Local Git actions require an explicitly approved workflow.
- Missing tools, asset limitations, and unavailable verification are reported without expanding scope.
- Do not claim that a feature is implemented or tested without evidence.
- This document records the implementation plan; it does not itself authorize implementation.

## 10. Historical mechanics progress — 2026-10-23

| Task | Status | Verification evidence |
|---|---|---|
| T1 | Complete | Type check, lint, production build and Chrome foundation mount passed; project-local cache/temp configuration recorded in `docs/T2_ASSET_VALIDATION.md` |
| T2 | Complete — prototype gate passed | Candidate preserved; transparency, appearance, resolution, hub stability and independent 7px circle checked. `docs/static-verification.json` and `docs/T2_ASSET_VALIDATION.md` contain evidence. |
| T3 | Complete | 86 original mathematical cases passed at that checkpoint; see the consolidated pure-math record in [T2–T6 evidence](docs/T2_T6_IMPLEMENTATION.md). |
| T4 | Finished | Integration tests and real Chrome mouse capture/outside release/direction/cancellation checks passed. Protocol touch checked; physical-device verification remains pending. |
| T5 | Finished | Single 240ms GSAP snap, interruption/stale-callback tests, reduced-motion behavior and all five Chrome settled positions passed; track-center error 0 CSS pixels in the final run. |
| T6 | Finished | Keyboard, native buttons, explicit confirmation during settling, repetition and active-gesture rejection tested. No automatic navigation; URL unchanged. See `docs/T2_T6_IMPLEMENTATION.md`. |
| T7 | Complete — defined baseline | Keyboard semantics, endpoint focus retention, reduced motion, target sizes, 320px scrolling and control separation passed; see docs/T7_T8_VALIDATION.md. |
| T8 | Complete — automation and handoff | 43 browser tests passed, 2 capability-specific skips; 15 settled screenshots captured. Physical-device/screen-reader checks remain explicitly pending in docs/T7_T8_VALIDATION.md. |

T4, T5 and T6 remain Finished. The user approved a 1-45 CSS-pixel drag band. Its three outdated test cases were corrected before T7/T8; the unchanged band is included in the current validation. Prior reports remain historical evidence. T7/T8 address endpoint focus and desktop control overlap without changing the steering mechanics.

T1–T6 are complete under the user's explicit authorization. The original and candidate assets remain intact, all work is local, and final visual refinement is deferred. T7/T8 automated validation and remaining manual physical-device/screen-reader checks are recorded in docs/T7_T8_VALIDATION.md. No routes, destination pages or cinematic transitions were added during T1–T8. Cinematic placeholders were implemented afterward (Section 11).

The intermediate pointer and broad-interior revisions are preserved in [consolidated historical evidence](docs/T2_T6_IMPLEMENTATION.md#consolidated-historical-records). Their former circle/ring geometries are superseded. The desktop control overlap and endpoint focus findings were subsequently resolved and verified in T7/T8; physical-device and screen-reader checks remain pending.

## 11. Implemented cinematic placeholder prototype

The user separately approved the cinematic architecture and sequential implementation after the mechanical baseline. This section supersedes the earlier cinematic scope exclusions for the placeholder prototype only. Preserve historical T1–T8 records; the mechanical behavior derives from the contour-based 1–45 CSS-pixel baseline at `d945e4a`. Later WebP checksum metadata and shared-streak changes are recorded in the health audit and Race Start documents; older circle/ring reports are historical.

Baseline revalidated before implementation: 127 unit/integration tests, lint, TypeScript and production build passed; Chromium 15 and WebKit 14 browser checks passed, Firefox 14 passed on a browser-permission retry, with two expected Chromium-only touch skips overall. The contour verifier passed 7,244 assertions with no external-control interceptions. Artwork hashes match. T7's defined baseline and T8 automation/handoff are complete; physical Android/iOS, native Safari and screen-reader checks remain pending. No new mechanical work is authorized by this phase.

### Fixed implementation decisions

- HOME confirms without leaving navigation. The other four selections enter placeholder content only; no routes, full portfolio pages, audio or deployment.
- Keep `useWheelNavigation`, section definitions, contour/hit testing and artwork assets unchanged. The mounted navigator remains the only mechanical controller.
- A shared decorative artwork component renders the stationary wheel and cinematic copy with identical calibration. Only one is visible at a time; the copy has no mechanical controls. The full navigator is inert during travel and section viewing.
- Own cinematic state separately: navigation → entering → section → restoring → navigation. Capture destination once per accepted confirmation. Ignore repeated requests; Escape reverses entry.
- Use existing GSAP: approximately 1.8s entry and 1.2s reverse, restrained abstract streaks and decorative blur, no shake/overshoot/literal scenery. Reduced motion uses a 150ms fade without spatial movement.
- Desktop floating control: 72px at right-center; mobile: 56px at bottom-right with safe-area spacing. Restore previous selection, angle, navigation scroll and focus.
- Animate transforms/opacity outside React's render loop. Measure at boundaries; settle at the requested endpoint on resize, hiding or a new reduced-motion preference. Clean up owned animations/listeners/temporary scroll styles.
- No Git mutations or development-server management. Browser checks may use their own isolated production preview, never reusing the manually managed server.

### Ordered tasks and gates

| Task | Status | Gate |
|---|---|---|
| C1 — Baseline and approved phase | Complete — historical checkpoint | `cinematic-feature` was clean at `d945e4a` before implementation; approved contour geometry and prior baseline checks were confirmed. |
| C2 — State and placeholder contract | Complete | 130 tests, TypeScript and lint passed. HOME and synchronous request guards verified independently of mechanics. |
| C3 — Shared artwork and continuous handoff | Complete — automated gate | Desktop/mobile checks passed across all four destinations in Chromium, Firefox and WebKit: image/shadow handoff within 0.25px, one visible wheel per sampled frame, exact returned stage geometry and maximum 1/255 channel rasterization difference. Screenshots inspected. |
| C4 — Cinematic choreography | Complete — automated gate | All three engines passed timed entry/return, fixed rotation, streak appearance/cleanup and heading-focus checks. |
| C5 — Accessibility and lifecycle | Complete — automated gate | All three engines passed HOME/duplicate guards, reduced motion, focus/scroll restoration, Escape, resize, motion-preference changes and synthetic hiding. Lifecycle checks interrupt both entry and restoration. |
| C6 — Regression and manual-review handoff | Ready for manual visual review | 130 unit/integration tests, type checking, lint and production build passed. Initial full sweep passed 43 mechanical browser cases (2 capability skips); two cinematic issues were corrected, then all 39 affected cross-browser checks passed. Current-build band verifier passed 7,244 assertions with zero external-control interceptions. User aesthetic approval and actual-device fluidity review remain pending. |

The recorded gates describe the cinematic checkpoint; they are not fresh checks of the current Race Start working tree. No phase is considered aesthetically complete before the user's manual visual review.

C3 diagnostics: initial byte-exact screenshot comparison detected a maximum 1/255 channel difference over 1,325 pixels after a compositing round trip, with mean absolute channel difference 0.0018/255 and identical geometry. The gate now explicitly permits only that rasterization tolerance and samples visibility on every animation frame. Mobile selection in the verifier uses keyboard controls because inactive track labels are intentionally clipped. No mechanical changes were made to resolve these test-harness findings.

Final implementation evidence and manual review checklist: `docs/CINEMATIC_PROTOTYPE.md`. The first full run found a Firefox carrier-style cleanup issue and WebKit pointer-invoker focus difference. Both were fixed outside the wheel mechanics and verified by the final 39-case targeted rerun. Headless frame-time samples are recorded explicitly; they do not establish steady 60fps or physical-device performance. No branch changes, commits, dependency installations, remote writes or development-server management occurred. The cinematic phase remains pending user visual review rather than being declared aesthetically complete.


## 12. Implemented Race Start and latest available verification — 2026-10-26

Race Start is implemented in the local working tree. [The feature contract](docs/RACE_START_IMPLEMENTATION_PLAN.md) retains the final requirements; [timing and validation evidence](docs/RACE_START_TIMING.md) describes the implemented 600ms START entrance and measured behavior. Existing user-owned changes remain uncommitted on `loading-section`; historical branch/status snapshots elsewhere apply only to their dated tasks.

Implemented decisions:

- One `RaceStartOverlay` owns four cleaned-up light timers (0/1/2/3s), explicit native START, synchronous duplicate guard and scoped animation/fallback. Fifth light illuminates only on accepted activation.
- App keeps HOME and the sole wheel controller mounted behind an inert intro gate. Completion/failure releases HOME at index 2 / 0° and restores focus without confirming a section or changing the URL.
- Store `gt3-race-start-expires-at` at activation for 900,000ms. Finite future expiry bypasses the intro; bypass does not extend expiry. Storage errors permit entry without persistence.
- Share only six decorative streak positions and three tweens through `speedStreaks.ts`. Normal section entry/restoration retains its separate controller and timing. Startup uses an approximately 1.5s timeline with an overlapping 250ms overlay fade; reduced motion uses 150ms and no pulse.
- START fades in for 600ms then pulses; it remains enabled during entrance. Resource readiness, pre-React recovery and image-error retry were not adopted. The older health-audit startup proposal is superseded by the final feature contract.

| Evidence scope | Recorded result | Interpretation |
|---|---|---|
| T7/T8, 2026-10-23 | 127 tests; 43 browser passes, 2 capability skips; 7,244 contour assertions | Historical mechanics baseline; not current Race Start validation. |
| Cinematic checkpoint | 130 tests; final targeted 39 browser passes after two fixes | Placeholder cinematic automation; user aesthetic review remains pending. |
| Health audit, 2026-10-25 | 130 tests; 70 browser passes and 2 skips across completed executions; 7,244 contour assertions via temporary adapter | Historical pre-Race Start health/performance evidence, including WebP alpha equivalence. |
| Latest Race Start report, 2026-10-26 | 149 tests; TypeScript, zero-warning lint and production build passed; 35 Race Start/cinematic browser passes and 1 capability skip in Chromium/WebKit | Latest available results, not rerun by this documentation task and not a full current cross-browser mechanical sweep. |
| Latest Firefox attempt | 18 failures at `browserContext.newPage: Target crashed`, before application load | Current Firefox application behavior unverified; historical successful runs do not close this gap. |
| Documentation cleanup | Complete-record consolidation, local link/anchor/reference and preservation checks | Documentation checks only; no application verification or aesthetic approval claimed. |

## 13. Pending validation, limitations and future approval

Pending manual validation: physical Android/iOS drag/capture/cancellation, native Safari, NVDA/VoiceOver, actual-device cinematic/startup fluidity, and final cinematic aesthetic review. The current Firefox startup failure also leaves a browser verification gap. Protocol touch, synthetic cancellation/hiding and Windows WebKit do not establish physical-device results.

Known limitations: no resource-readiness gate, explicit image-error recovery or pre-JavaScript failure UI; the intro can finish before very slow artwork delivery. Local timing is not hosted performance. Short-cycle heap observations do not settle long-session leak attribution. Standalone CDP transport reliability and an external dependency vulnerability audit remain unresolved; no upgrades or security-audit result are claimed. Generated `.tmp` reports can be overwritten by later runs, so checkpoint reports must retain their scope and limitations.

Future work requires separate approval: implementation of reviewed Engineering Dossier internal designs (ABOUT layout still under review), real portfolio content/experience destinations, routing, sound, final artwork/badge/font treatment, full responsive art direction, resource/performance/recovery changes, publishing or deployment. Preserve HOME, approved mapping, mechanics and existing cinematic transitions during unrelated tasks. Do not infer implementation authorization from design discussions.
