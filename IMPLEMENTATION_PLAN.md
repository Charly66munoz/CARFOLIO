# Implementation Plan — Isolated GT3 Steering-Wheel Navigation

## 1. Authority, authorization, and current progress

This document records the finalized implementation plan discussed with the user, including the asset-validation gate in T2 and early real-browser interaction check in T4.

- Architecture: approved in principle, with the requested refinements incorporated below.
- Authorization: on 2026-10-23 the user explicitly authorized completing T2 with the supplied transparent candidate and proceeding sequentially through T4, T5 and T6, including targeted positioning corrections and temporary minor visual differences. No approval is required between these authorized tasks. T7/T8, full pages, routing, cinematic transitions and publishing remain outside this delivery.
- Current progress: T1–T6 are complete for the local prototype. T2 passes with the authorized candidate and independent circular boundary. See `docs/T2_ASSET_VALIDATION.md` and `docs/T2_T6_IMPLEMENTATION.md` for measurements, checks and remaining verification. T7/T8 have not been undertaken as comprehensive phases.
- Read the current `AGENTS.md`, `PROJECT_CONTEXT.md`, and this file completely at the beginning of each new project session before making project-specific recommendations or changes.
- `AGENTS.md` governs operational restrictions. `PROJECT_CONTEXT.md` governs approved product, visual, and interaction requirements. This plan governs architecture, tasks, and acceptance criteria where consistent with those documents.
- Report inconsistencies rather than silently resolving them. Update progress only from actual implementation and verification evidence.

## 2. Scope and fixed behavior

Build a local React + Vite + TypeScript + Tailwind CSS prototype using native Pointer Events and GSAP for snapping.

Preserve the approved [Figma design](https://www.figma.com/design/oEXjYLVP8tfpWG5PO16x1o), palette, composition, and steering convention. The corrected Figma states and `PROJECT_CONTEXT.md` are consistent.

| Index | Section | Angle | Counter |
|---:|---|---:|---|
| 0 | ABOUT | −36° | 01 / 05 |
| 1 | CONTACT | −18° | 02 / 05 |
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

The deliverable excludes actual portfolio pages, routing, cinematic transitions, minimized navigation, sound, backend work, publishing, and deployment. Basic mobile usability is included; full responsive art direction remains a later phase.

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
| `App` | Demonstration shell and last-confirmed feedback |
| `SteeringWheelNavigator` | Composition, instructions, previous/next controls, accessible status |
| `HorizontalSectionTrack` | Labels, counter, underline, horizontal positioning |
| `SteeringWheel` | Stationary interaction surface, rotating artwork, center button |
| `useWheelNavigation` | Pointer lifecycle, state, keyboard commands, snapping, confirmation |
| `wheelMath` | Angles, limits, nearest section, hit testing, track calculation |
| `sections` | Ordered section definitions and derived types |

Keep pointer and animation logic in the controller hook. Introduce no additional components, hooks, libraries, or architectural layers unless demonstrated complexity requires them. Avoid state-management libraries, generic interpolation utilities, and premature optimization.

### Public contract

```ts
type SectionId =
  | 'about'
  | 'contact'
  | 'home'
  | 'projects'
  | 'stack';

interface SteeringWheelNavigatorProps {
  onConfirm: (section: SectionId) => void;
}
```

The demonstration records the confirmed section without changing the URL or rendering destination pages. Controlled selection, persistence, and asynchronous navigation are outside the initial contract.

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

The latest user revision supersedes the narrow perimeter ring. Use one invisible circle of radius `0.37 ? stage width`, inscribed within the visible outer silhouette. The excluded central hub radius is `max(44px, 0.22 ? stage width) / 2`, matching the confirmation target. The rest of the circle, including rim, spokes, controls and openings, initiates dragging. The radius is independent of image alpha and rotation at runtime.

Use existing radial math and pointer capture. Freeze and rebase ongoing gestures only inside the excluded hub. No perimeter stroke or focus circumference is displayed. A compact keyboard-only focus badge preserves visible focus. Decorative instructions must not intercept the drag area. See `docs/INTERIOR_DRAG.md`; previous ring measurements are historical evidence.

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
| −27° | CONTACT |
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

### T2 asset-validation gate

The original neutral HOME wheel from Figma (`5:22` in frame `5:2`) was inspected and retained unchanged. On 2026-10-23 the user supplied and authorized a transparent candidate for the prototype, accepting minor visual differences until final refinement. It was copied from `dist/assets/steering-wheel-neutral-DLpvQqP8.png` to `src/assets/steering-wheel-transparent-candidate.png` before any build, without overwriting the original.

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
- Reduced motion removes snapping animation while retaining direct manipulation. Do not introduce pulsing animation in this phase.

## 6. Files and progressive tooling

All additions remain inside `carfolio`; preserve both existing reference documents.

```text
carfolio/
├─ AGENTS.md
├─ PROJECT_CONTEXT.md
├─ IMPLEMENTATION_PLAN.md
├─ package.json
├─ package-lock.json
├─ .npmrc
├─ .gitignore
├─ index.html
├─ vite.config.ts
├─ tsconfig*.json
├─ eslint.config.js
├─ README.md
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ styles.css
│  ├─ assets/steering-wheel-neutral.png
│  └─ features/wheel-navigation/
│     ├─ sections.ts
│     ├─ wheelMath.ts
│     ├─ useWheelNavigation.ts
│     ├─ SteeringWheelNavigator.tsx
│     ├─ SteeringWheel.tsx
│     ├─ HorizontalSectionTrack.tsx
│     └─ __tests__/
│        ├─ wheelMath.test.ts
│        └─ SteeringWheelNavigator.test.tsx
└─ T8 additions:
   ├─ playwright.config.ts
   └─ tests/wheel-navigation.spec.ts
```

This is a proposed implementation structure, not a claim that these files exist.

Tooling sequence:

1. Application stack, GSAP core, ESLint, strict TypeScript, React Strict Mode.
2. Vitest for mathematical tests.
3. Testing Library and jsdom for interaction integration.
4. Manual real-browser smoke testing in T4.
5. Playwright for comprehensive automation in T8.

Use npm and a lockfile, resolving compatible stable releases during authorized setup. Keep caches, temporary files, downloads, and reports inside the project. Bind the development server to localhost. Verify existing runtime compatibility without changing global tooling.

## 7. Implementation tasks and acceptance gates

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

Execute tasks in order and verify each gate before proceeding with dependent work. At each gate, report changed files, checks actually run, results, unresolved issues, and available local Git status.

T3 was completed independently while the original T2 asset decision was pending. The subsequent explicit T2–T6 authorization supersedes that earlier restriction; T2 was validated before implementing T4 and T5, and T5 was verified before T6. Tests of the circular initiation region concern the independent boundary rather than tracing image alpha.

### T4 smoke-test procedure

Use the local application in an available real browser:

1. Press the visible rim, drag outside the element, and release. Verify capture keeps the gesture active and release clears ownership.
2. Drag clockwise and counterclockwise. Verify direction, limits, and committed release selection.
3. Exercise cancellation and verify rollback without confirmation.
4. Test basic touch dragging and release on available touch hardware.

When native cancellation cannot be reproduced reliably, dispatch a cancellation event inside the real browser to verify handler behavior and label that result as synthetic. Record native cancellation or physical touch checks as pending when unavailable.

This smoke test requires no new automation library. Comprehensive browser automation remains in T8.

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

T8 adds browser coverage, deterministic settled screenshots, responsive checks, and real mouse event behavior. Synthetic touch testing does not substitute for physical-device validation. Review keyboard-only use, screen-reader feedback, Android touch, and iOS Safari where available; report unavailable checks as pending.

### Main risks

| Risk | Mitigation |
|---|---|
| Approved asset unsuitable for rotation | Mandatory T2 gate; report before proceeding; no unauthorized alteration |
| Empty areas accept dragging | Calibrated rim annulus |
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

## 10. Progress record

| Task | Status | Verification evidence |
|---|---|---|
| T1 | Complete | Type check, lint, production build and Chrome foundation mount passed; project-local cache/temp configuration recorded in `docs/T2_ASSET_VALIDATION.md` |
| T2 | Complete — prototype gate passed | Candidate preserved; transparency, appearance, resolution, hub stability and independent 7px circle checked. `docs/static-verification.json` and `docs/T2_ASSET_VALIDATION.md` contain evidence. |
| T3 | Complete | Original 86 mathematical tests continue to pass; section-angle configuration remains unchanged. |
| T4 | Complete | Integration tests and real Chrome mouse capture/outside release/direction/cancellation checks passed. Protocol touch checked; physical-device verification remains pending. |
| T5 | Complete | Single 240ms GSAP snap, interruption/stale-callback tests, reduced-motion behavior and all five Chrome settled positions passed; track-center error 0 CSS pixels in the final run. |
| T6 | Complete | Keyboard, native buttons, explicit confirmation during settling, repetition and active-gesture rejection tested. No automatic navigation; URL unchanged. See `docs/T2_T6_IMPLEMENTATION.md`. |
| T7 | Not started | None |
| T8 | Not started | Comprehensive browser and device checks pending |

T1–T6 are complete under the user's explicit authorization. The original and candidate assets remain intact, all work is local, and final visual refinement is deferred. T7/T8 comprehensive accessibility, physical-device and cross-browser validation remain future work. No routes, destination pages or cinematic transitions were added.

## Targeted pointer corrections ? 2026-10-23

The user authorized only expanding the invisible boundary to 1px plus 5px tolerance per side and suppressing pointer-induced wheel focus circles while retaining keyboard focus. See `docs/POINTER_CORRECTIONS.md`. Earlier 7px measurements remain historical evidence. The desktop circle/control overlap and endpoint auxiliary-button focus loss remain known, unresolved audit findings; this correction does not mark them fixed.
