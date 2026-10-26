# Race Start startup experience — implementation proposal

Status: **planning only; implementation is not authorized by this document.** No loader, persistence, shared effect extraction, or cinematic refactor was implemented during the audit.

This proposal follows the user's Race Start requirements and the current source, not the historical isolated-prototype descriptions. See [application health audit](APPLICATION_HEALTH_AUDIT.md) for validation and remaining limits.

## A. Current application assessment

Development verdict: **READY WITH MINOR ISSUES**. The WebP has removed the earlier large PNG transfer problem. Current production measurements show a wheel LCP around 140 ms on local desktop and 2.34 s on the throttled mobile scenario. These are browser measurements of a local production preview, not a public-hosting SLA.

The existing application already has one continuously mounted wheel controller, explicit confirmation, keyboard alternatives, reduced motion, and reversible section transitions. HOME initializes at index 2 / 0°. Section mapping remains ABOUT −36°, CONTACT −18°, HOME 0°, PROJECTS +18°, STACK +36°. Nothing in this plan changes drag math, source contour, hub, stage scale, snapping, or navigation semantics.

Missing startup capabilities are requirements for the new feature: no resource-readiness contract, no initial resource failure UI, no pre-React startup shell, and no first-visit preference. They do not require a navigation rewrite.

The required PRESS TO START makes this an interactive introduction. Measure **resource preparation**, **voluntary time waiting at the button**, and **the user-triggered cinematic reveal** separately. Do not describe the latter two as network loading or promise an automatic 250 ms dismissal for the full first-visit flow.

## B. Proposed architecture

Keep React state local. Use the existing GSAP package. Add no router, state library, animation package, video, large raster asset, or second wheel controller.

| Element | Responsibility |
|---|---|
| Small shell in `index.html` | Immediate graphite background, unlit CSS assembly and honest initializing text, independent of the wheel and React. Native recovery link if the app cannot boot. |
| `RaceStartOverlay` | Five columns of lamps, status, semantic START button, recovery UI, and a scoped instance of the shared streak decoration. |
| `useRaceStart` | Resource readiness, bounded waiting, decorative lamp steps, guarded start transaction, startup GSAP context, interruption and cleanup. |
| Existing `App` | Keep the current application mounted behind a startup-owned wrapper; compose inert state, hand off to the startup overlay, and enable HOME after completion. |
| Shared `SpeedStreaks` | The current six spans, offsets and classes, extracted without changing their rendered structure. |
| Small `addSpeedStreaks` helper | Append the existing three GSAP streak tweens to a supplied timeline and scoped elements. Each flow owns its own timeline and DOM nodes. |

The startup wrapper is separate from `.navigation-scene`, `.wheel-stage`, and the cinematic wheel carrier. Startup may own its wrapper's opacity; it must not compete for the transforms or inline properties owned by normal navigation. Normal `useCinematicTransition` stays in `navigation` throughout startup.

Mount the real navigator once at its existing HOME defaults. Keep it laid out and allow the eager image to load; do not use `display:none` or wait to mount it until START. Make the underlying application inert while the startup cover is active, composing that gate with the existing cinematic gate. A startup gate must never enable a navigator that the cinematic controller has independently made inert.

Use existing refs where practical (`wheelStageRef`, `navigationRef`). Add only an outer application-stage ref. After the overlay leaves, remove its DOM and restore startup-owned styles before enabling interaction. Focus the existing active HOME label after the enable commit; do not call the application confirmation function to initialize HOME.

### Pre-React shell and handoff

Keep critical shell CSS small and inside the HTML so it can paint before the main bundle or wheel. Build the light housing with CSS gradients, borders and static metallic details. The shell is a sibling of `#root`, not markup silently placed into a root that still uses `createRoot` rather than hydration.

The shell shows only initialization before React takes over. Do not run a second independent light sequence in HTML. Once the React overlay is committed and styled, hide the shell in the same paint opportunity; remove it after startup is safely handed off. Avoid two visible assemblies or two accessible status regions.

A tiny native boot watchdog must also handle missing JavaScript or failure before React readiness. Its recovery presentation uses a real reload link, so recovery still works without the main bundle. React must explicitly cancel the watchdog after its readiness handoff. If the early mount crashes, the watchdog exposes recovery rather than leaving an endless shell. A small `createRoot` uncaught-error handoff may expose it earlier; the installed React DOM types support that option. Preserve console reporting.

This bridge is only shell ownership and recovery, not a second application state store. Clean up its timer/listeners after handoff. Deployment CSP treatment for any inline bootstrap is a future hosting decision.

## C. Transition reuse strategy

### Existing code and behavior

`App.confirm()` calls `useCinematicTransition.enter()` for the four non-HOME destinations. `enter('home')` intentionally returns false. The controller captures the destination, invoking control and scroll position; `CinematicLayer` provides streaks, a decorative wheel carrier and the floating restore button.

The hook measures the existing wheel and dock, then creates a `gsap.context()` and paused timeline in a layout effect. Normal entry fades the navigator over 0.18 s, moves/scales the carrier over 1.23 s starting at 0.22 s, and reveals placeholder content over 0.7 s starting at 1.1 s. Entry ends around 1.8 s; restoration reverses at timeScale 1.5, around 1.2 s. Reduced motion uses 0.15 s fades.

The six streaks use restrained opacity, horizontal translation, scaleX, a 1.2 px blur and staggered timing. GSAP completion commits `section`; reverse completion commits `navigation`. Escape reverses entry. Resize, document hiding and a new reduced-motion preference settle travelling motion to its requested endpoint. Context revert, explicit carrier-style cleanup and listener removal protect subsequent entries and unmounts.

### Reuse boundary

Reuse exactly:

- The six streak spans and their layout classes.
- The current three streak tweens, stagger, opacity cap and blur through a small shared helper.
- The existing palette, power1/power2 easing language, reduced-motion policy and GSAP context lifecycle pattern.

Do **not** call `enter('home')`, invent a placeholder HOME destination, reverse the current wheel-to-dock timeline, or add startup phases to the existing cinematic state machine. That timeline assumes a visible main wheel, a measured floating dock, a section destination and navigation focus/scroll restoration. Startup has different geometry and ownership.

The startup hook needs its own small reveal timeline: extinguish lamps in one commit, disable START, run the shared streak choreography, fade the assembly/cover out and reveal the already prepared HOME. Do not animate the wheel rotor or create another wheel image for startup.

Future extraction modifies `CinematicLayer.tsx` and replaces only the literal streak tween block in `useCinematicTransition.ts`. Preserve the existing normal-navigation timings and selectors. This extraction is proposed work after approval; no cinematic code was changed in this audit.

## D. Startup state machine

Readiness and decorative progress are independent. Readiness is a resource/layout result, never a count of illuminated lamps.

| State | Meaning and available actions | Valid next states |
|---|---|---|
| `booting` — HTML shell | App bundle not handed off; unlit assembly, initializing text, boot watchdog. | `loading`, native recovery |
| `loading` | React mounted; essential resources pending; decorative columns progress. No enabled START. | `ready`, `recovery` |
| `ready` | Critical image decoded and interface prepared; all columns lit; START enabled. | `launching`, `recovery` if readiness becomes invalid |
| `launching` | Synchronous start guard acquired; all lamps off; button disabled; one owned reveal timeline. | `complete` |
| `complete` | Startup DOM removed; HOME enabled at 0°; startup resources cleaned up. | Terminal for this page instance |
| `recovery` | Actual failure or a clearly labelled slow-loading timeout. Offer retry/reload; timeout can also offer keep waiting. | `loading` on keep-waiting, `ready` if the pending attempt completes, or full `booting` through reload |

Transitions must check the current phase synchronously through a ref before publishing state. A repeated click, held Enter, pointer double tap or stale completion cannot acquire a second start transaction. Use an attempt/generation token to ignore promise callbacks after cancellation, retry or unmount.

Cancellation policy recommendation:

- Escape during `launching` settles directly to prepared HOME, reverts startup styles and cleans up once. Do not reverse into a half-illuminated assembly.
- During `loading`, Escape must not claim readiness or reveal a broken wheel. A skip affordance, if approved, skips decoration rather than critical resource preparation.
- During `ready`, an approved Skip control can choose the compact fade to HOME. The standard START still provides the full experience.
- Resize, hidden-document entry or switching to reduced motion while launching also settle to HOME. Do not keep a suspended timeline holding the interface inert. Avoid focusing a background tab; any deferred focus handler must remove itself on return/unmount.

### Readiness contract

Require all of the following:

1. React committed the actual navigator and installed its event handlers; no synthetic selection should be dispatched during startup.
2. Essential application CSS is applied. Verify its existing computed styling plus a nonzero wheel stage and correctly centered HOME track, using actual DOM geometry after layout/ResizeObserver opportunities.
3. The real main `.wheel-artwork` element has `naturalWidth > 0`, completed successfully, and its `decode()` promise resolved.
4. Initial layout has had a rendering opportunity. Recheck geometry immediately before accepting START if the viewport changed while waiting.

Attach image failure/load handling before testing cached completion; handle rejection and an image that was already broken. Decode the actual mounted element; a separate preload `Image` is unnecessary. Keep the current eager behavior. Optional decoration failures must not reject the whole readiness gate.

Current typography uses system fallbacks with no downloaded font files. Do not wait on nonexistent fonts or indiscriminately gate on `document.fonts.ready`. If essential web fonts are approved later, enumerate only those and provide bounded fallback behavior.

Do not use `window.load`, `image.complete` alone, network-idle detection, an arbitrary timer, or LCP as readiness. A covered/hidden HOME may not produce its normal LCP until revealed. The audit also confirms that `complete` can be true for a broken image.

Recommend a **10 s slow-loading threshold**, subject to approval. At the threshold show actionable recovery rather than an endless animation or a false successful START. This is a maximum unattended pending state, not a minimum duration. Check elapsed time on visibility return because browser timers may be throttled. A still-pending attempt may subsequently become ready; a genuinely failed image requires retry/reload.

The strict successful path always reveals a valid wheel. A degraded text-navigation-only bypass would be a separate product decision; do not silently treat missing artwork as successful readiness. Native reload recovery covers failures before React is usable.

## E. File-level implementation plan

These are **future changes**, all under the project root.

| File | Proposed change |
|---|---|
| `index.html` | Tiny independent initialization shell, critical shell styling, accessible native recovery and boot watchdog. |
| `src/main.tsx` | Minimal boot-error/handoff integration if required by the shell; preserve Strict Mode and error logging. |
| `src/App.tsx` | Compose startup gate and outer application wrapper; keep the existing navigator mounted; hand off focus after completion. |
| `src/styles.css` | Responsive lamp assembly, graphite/metallic treatment, status/button/focus styling, reduced-motion rules. Preserve all current HOME/navigation rules. |
| `src/features/race-start/RaceStartOverlay.tsx` — new | Accessible cover with five columns, proposed two lenses per column, status, START and recovery UI. |
| `src/features/race-start/useRaceStart.ts` — new | Readiness contract, state transitions, light stepping, reveal timeline and cleanup. |
| `src/features/cinematic-transition/SpeedStreaks.tsx` — new | Extract the six existing spans and container without visual changes. |
| `src/features/cinematic-transition/speedStreaks.ts` — new | Extract only the existing GSAP streak block; receive timeline and scoped nodes. |
| `src/features/cinematic-transition/CinematicLayer.tsx` | Render the extracted decoration in its existing place; retain wheel/dock ownership. |
| `src/features/cinematic-transition/useCinematicTransition.ts` | Call the shared streak helper with the existing timeline; retain all navigation behavior. |
| `src/features/race-start/__tests__/useRaceStart.test.tsx` — new | Readiness, guards, failures, interruption and cleanup tests. |
| `src/features/race-start/__tests__/RaceStartOverlay.test.tsx` — new | Button semantics, honest status, keyboard interaction and motion preferences. |
| `tests/race-start.spec.ts` — new | Browser startup, recovery, performance and accessibility scenarios. |
| `tests/helpers/startPortfolio.ts` — new | Complete the real introduction for existing navigation suites; no production bypass parameter. |
| Existing browser test files | Call the helper after navigation, including new-context band cases; preserve every existing assertion. |
| `README.md`, `PROJECT_CONTEXT.md`, `IMPLEMENTATION_PLAN.md` | Record the newly authorized scope and verified results after implementation. |

Do not change `useWheelNavigation.ts`, `wheelMath.ts`, `wheelHitTest.ts`, `wheelContour.ts` coordinates, `presentation.ts`, section definitions or wheel artwork assets for this feature.

## F. Implementation sequence

1. **Confirm open product choices below.** Capture current files/hashes, branch and dirty state. No branch change, commit, package installation or remote operation.
2. **Extract the shared effect.** Move existing streak DOM/tweens with no parameter-heavy framework. Run the current cinematic and mechanical regressions before adding startup.
3. **Establish readiness/recovery.** Implement cached/pending/failed image handling, layout checks, bounded waiting and generation cleanup. Prove that no decorative timer controls readiness.
4. **Build the independent shell and light assembly.** Validate appearance at 320, 390 and 1440 px, no additional asset request, shell/React handoff and missing-JS recovery.
5. **Add READY and the guarded START transaction.** Complete early-ready lamp steps immediately. Verify native keyboard/touch semantics and no click-through confirmation.
6. **Add the startup-only reveal.** Reuse scoped streaks, implement reduced motion and interruption, and remove all startup ownership before enabling HOME.
7. **Persistence only if separately approved.** Implement the chosen return-visit policy after the complete nonpersistent path works.
8. **Regression, profiling and visual review.** Run all checks, compare readiness metrics to this baseline, review actual screenshots and document unavailable hardware/a11y checks. Leave implementation local for review.

Each step must have a passing gate before the dependent step. If sharing effects changes normal navigation behavior, resolve that extraction before introducing startup.

## G. Acceptance criteria

| Area | Measurable gate |
|---|---|
| Visual identity | Graphite/carbon assembly, restrained silver/ice detail and sports red lenses; five vertical columns with multiple lenses; no unrelated scenery, video or new large image. Manual premium appearance sign-off still required. |
| Light sequencing | Columns illuminate left to right once, not as a repeating flashing loop. Proposed cadence: one column every 180 ms. If resources finish early, immediately light remaining columns and enable START in that state update; no wait for the decorative sequence. |
| Truthful waiting | All five columns may be lit while initialization is still pending, but text still says initializing and START is unavailable. Lamp count is not a byte-percentage indicator. |
| START | A native button with visible focus, target at least 44 × 44 CSS px, mouse/touch/Enter/Space support. Exactly one start per page instance; all lamps turn off together and the button disables. |
| Readiness | Successful cached, cold and delayed loads pass only with valid decoded wheel, committed interface and applied layout. Failed optional SVG does not trap entry. Broken critical artwork never produces a falsely enabled START. |
| Timing | No minimum loading duration. Proposed full reveal is about 1.5 s **after user activation**, including a final 250 ms cover fade; reduced-motion fade is at most 150 ms with no spatial movement or pulse. Timings are product proposals below. |
| HOME endpoint | HOME index 2, exact 0°, active label centered within 1 CSS px, one main wheel visible, normal input enabled, no confirmation recorded merely by START. URL unchanged. |
| Navigation preservation | All existing mechanical/cinematic tests still pass. Normal entry remains approximately 1.8 s, restore 1.2 s, reduced fade 150 ms; hit region and mapping remain unchanged. |
| Accessibility | Honest polite status updates, no per-lamp announcements, no focus trap, predictable HOME focus on handoff, accessible error/retry and no inactive app controls in the tab order. |
| Motion and sound | No repeated flash sequence. Slow subtle text opacity pulse only while ready; no pulse under reduced motion. No automatic audio or added audio download. |
| Lifecycle | Unmount/Strict Mode, resize, hidden tab, reduced-motion changes and Escape cannot leave duplicate contexts, stuck inert state, visible streaks, an overlay or stale callbacks. Idle HOME has no active startup timelines/timers/observers. |
| Performance | No new raster/video/font/library download; lamp animation changes React at most once per column, never per animation frame. Provisional added initial JS+CSS budget: ≤10 kB gzip. With five repeated runs under this audit's settings, essential-resource readiness should not regress by more than 100 ms desktop or 10% throttled mobile without investigation. |

The performance budgets are proposed acceptance targets, not already achieved measurements. Adding a tiny inline shell may improve FCP without improving actual HOME readiness; that alone does not pass the performance gate.

## H. Testing strategy

**Unit/integration:** test real state transitions with controlled decode promises and fake timers. Cover cached success, error before listener attachment, rejection, still-pending timeout, late success, keep-waiting, retry invalidation, optional failures, early readiness before lamp sequence completion, and cleanup. Exercise Strict Mode mount/unmount. Repeated native activation must not create a second transition. Assert readiness does not dispatch wheel selection or call `App.confirm()`.

**Browser:** Chromium, Firefox and WebKit; desktop and 320/390 px layouts. Use native mouse/keyboard and Chromium protocol touch, documenting that physical devices remain separate. Intercept local requests to test delayed/failed WebP, failed CSS, failed JS, cached loads and noncritical failures. Test initialization visible before the wheel, single shell handoff, simultaneous lights-out, focus, Enter/Space held across handoff, background tabs, resize, reduced-motion changes and Escape. Verify that an early return or interrupted intro cannot leave hidden controls enabled or a page blocked.

**Regressions:** preserve the 130 current unit/integration tests and all current browser assertions. Adapt setup through a real startup completion helper; do not add a production query-string bypass or weaken the mechanical tests. Rerun the dedicated 7,244 contour assertions against the current WebP. Test entry and restoration after startup, including repeated visits to all four placeholders and returning to the same committed section.

**Performance:** at least five cold and five warm production loads, plus five throttled mobile loads. Record custom marks for essential-ready, START, HOME revealed and startup cleanup. Report user dwell separately. FCP/LCP may refer to the loader, and trusted START input can stop further LCP reporting, so they must not replace the custom HOME/readiness measurement. Record requests, image decode, long tasks and new transfer bytes. Profile only after functional gates pass.

**Manual:** premium light appearance, wheel handoff, keyboard-only use, screen-reader announcements and physical Android/iOS/native Safari fluidity. Automated headless timings do not establish real-device smoothness or final aesthetic approval.

## I. Risks and open decisions

| Decision | Recommendation and trade-off |
|---|---|
| Full introduction duration | Recommend about 1.5 s of user-triggered acceleration, including the previously discussed 250 ms final fade. A 250 ms compact alternative preserves speed but provides much less of the requested cinematic sequence. Neither delays the resource-ready signal. Confirm before implementation. |
| Lamp assembly | Recommend five columns with two lenses per column, generated with CSS. Exact housing/lens treatment needs visual approval; no raster generation is currently necessary. |
| Fast first load | Preserve the required first-visit START button; immediately complete lamps on readiness rather than forcing a countdown. This respects the interactive product requirement without padding network preparation. |
| Skip/cancellation UI | Recommend an accessible compact-reveal option once ready; Escape during launch settles to HOME. Confirm whether first-time visitors should also see a Skip control. |
| Returning visitors | Prefer `sessionStorage`: full ceremony once per tab session, compact/direct reveal after real readiness on subsequent loads. `localStorage` persists across sessions in the same browser profile but may suppress the identity experience for too long and needs a reset/version policy. Neither is implemented or implicitly approved. |
| Storage failure | Catch unavailable storage; fall back to the normal nonpersistent experience without blocking readiness. If approved, write a versioned completion flag only after successful HOME reveal, never on initial request or failed loading. |
| Slow-loading threshold | Recommend 10 s before actionable recovery, with keep-waiting and retry. Confirm the copy and threshold; do not interpret elapsed time as successful readiness. |
| Failed critical wheel | Recommend a clear retry/reload screen. A text-only degraded mode would relax the required fully visible wheel endpoint and needs separate approval. |
| Effect extraction | Share only scoped decoration/tweens. Whole-timeline reuse risks coupling startup to destination, dock geometry and navigation focus restoration. |
| Hidden HOME and metrics | Keep layout mounted; do not gate on LCP or global visibility. Use custom readiness marks and screenshot/browser endpoint checks. |
| Bootstrap shell | Its CSS and recovery must function without React. Keep ownership/handoff small to avoid duplicate accessible UI or a second controller. |

Audio remains disabled, real routes/full portfolio content remain deferred, and publication remains outside scope. The next approval should concern this concrete plan and its open choices; this audit does not execute them.
