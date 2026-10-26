# Cinematic prototype — implementation and manual review

The user approved this local placeholder prototype on top of `d945e4a`. The validated contour-based mechanics were confirmed before edits. No branch changes, commits, dependency installations, source publishing or development-server management are part of this work.

## Architecture

`useWheelNavigation` remains the sole mechanical controller. Its source, angle configuration, math, calibrated contour/hit testing and both artwork assets are unchanged. `SteeringWheelNavigator` exposes an optional stage ref; the wheel's decorative image/shadow markup is shared through `WheelArtwork` without moving its pointer surface or controls.

`useCinematicTransition` owns a captured destination and four phases independently of page content. `CinematicLayer` provides the non-interactive visual wheel, six decorative streaks, and one native restore button. `App` supplies placeholder content through an ordinary content ref; the timeline has no knowledge of ABOUT/PROJECTS/STACK/CONTACT page implementations.

There is one visible wheel throughout normal travel. A layout-effect handoff aligns image and shadow before paint. Translation/scale affect only the visual carrier; its rotation derives from the confirmed centralized section definition. The original mounted navigator is inert during travel and section viewing. Source geometry, selection and angle remain intact for restoration.

GSAP core coordinates 1.8s entry and approximately 1.2s restoration. Reduced motion uses a 150ms fade without travel, streaks or blur. Repeated requests are rejected synchronously; Escape reverses entry. Resize, hiding or an enabled reduced-motion preference settles the requested endpoint. Scroll inputs are blocked only during travel without changing page dimensions or persistent scroll styles. Scoped animations and listeners are removed on unmount.

## Stage evidence

- C1: branch clean at `d945e4a`; existing baseline validated before implementation.
- C2: 130 unit/integration tests, TypeScript and lint passed.
- C3: initial Chromium gate passed at 1440px and 390px across all four destinations. Image/shadow entry bounds differ by less than 0.25px; frame samples see one visible wheel; returned stage geometry matches exactly. The measured screenshot tolerance is at most one channel level (1/255) for compositor rasterization, with no visible artwork change. Source/return and section screenshots were inspected.
- C4: real Chromium checks passed for timing, fixed rotation, streak appearance/cleanup, heading focus and restoration.
- C5: five Chromium checks passed for reduced motion/HOME/duplicate guards/focus/scroll, Escape, resize, preference changes and synthetic hiding. Unit tests, lint and TypeScript passed.
- C6: automated verification passed as detailed below. The prototype is ready for user manual visual review; the cinematic phase is not yet aesthetically signed off.

The initial cross-browser run identified two cinematic integration issues: a visible-style residue after changing motion preferences in Firefox, and pointer-invoker focus restoration in WebKit (which need not focus a clicked button). Endpoint cleanup now explicitly resets the decorative carrier, its initialization uses one write, and navigation capture handlers remember the actual activation target without changing mechanical event handling. Lifecycle tests also interrupt restoration, not only entry. Both corrections passed fresh final verification across all three engines.

Existing browser mechanics checks retain their assertions and now return through the floating wheel when testing multiple explicit confirmations. The contour verifier similarly restores navigation after hub confirmation before continuing its matrix. Neither harness bypasses the cinematic interaction lock.

## Final checks actually run

| Check | Result |
|---|---|
| `npm.cmd test` | 130 passed across four files; the original 127 mechanical tests remain intact. |
| `npm.cmd run build -- --outDir .tmp/audit-build` | TypeScript and Vite production build passed; existing `dist` preserved. |
| `npm.cmd run lint` | Passed, zero warnings. |
| Initial full `npm.cmd run test:e2e` | 68 passed, 2 expected capability skips, 2 cinematic failures. All 43 applicable mechanical cases passed; the two integration issues above were then fixed. |
| Final targeted cross-browser run | 39 passed, 0 failures, 0 skips, 0 flaky tests; 13 each in Chromium, Firefox and WebKit. Covers all cinematic cases plus the affected keyboard, capture, explicit confirmation and repeated-return paths. |
| `node scripts/verify-wheel-band.mjs` against the final audit build | 7,244 assertions passed; 360 contour points; zero external-control interceptions. |
| `git diff --check` | Passed. |
| Mechanical source/asset preservation | Diff against `d945e4a` is empty for the controller, math, sections, presentation calibration, hit testing, contour and assets. Both PNG SHA-256 values match `docs/T7_T8_VALIDATION.md`. |

Final browser command:

```powershell
npm.cmd run test:e2e -- --grep 'C3|C4|C5|C6|T7: keyboard|T8: inactive|T8: rapid|T8: real mouse' --output .tmp/cinematic-final-results
```

Browser processes required expanded execution permissions in this agent environment. Each run used its own production preview on 4173 with `reuseExistingServer: false`, and project-local builds/profiles/reports. The user's development server was not started, stopped or reused. No dependency installation occurred.

Evidence: `.tmp/playwright-report/results.json` (final 39 checks), `.tmp/cinematic-initial-results.json` (preserved initial full report), `.tmp/cinematic-final-results/` (screenshots and timing attachments), and `.tmp/wheel-band-verification/results.json` (current band matrix).

### Performance observations

Frame timing during one real GSAP entry in the final headless Windows run:

| Engine | Sampled frames | p95 frame interval | Maximum interval |
|---|---:|---:|---:|
| Chromium | 95 | 33.4ms | 83.3ms |
| Firefox | 109 | 16.7ms | 16.7ms |
| WebKit | 91 | 31ms | 41ms |

The coarse regression guard (p95 below 50ms) passed. These samples include occasional slower frames and do **not** establish steady 60fps. Actual-device fluidity, cold entry and native Safari performance remain part of manual review. Cinematic motion performs no per-frame React updates or layout measurements; only the six decorative streaks receive blur, and temporary compositing hints are cleared at rest.

## Files changed

- Composition/presentation: `src/App.tsx`, `src/styles.css`, `SteeringWheel.tsx`, `SteeringWheelNavigator.tsx`, and new `WheelArtwork.tsx` under `src/features/wheel-navigation/`.
- New independent feature: `src/features/cinematic-transition/{useCinematicTransition.ts,CinematicLayer.tsx,SectionPlaceholder.tsx,__tests__/useCinematicTransition.test.tsx}`.
- Verification: `vitest.config.ts`, `tests/wheel-navigation.spec.ts`, new `tests/cinematic-transition.spec.ts`, and `scripts/verify-wheel-band.mjs`.
- Documentation: `IMPLEMENTATION_PLAN.md`, `PROJECT_CONTEXT.md` (current-phase status only), `README.md`, this report, and the three review PNGs below.

No package manifests, lockfiles, mechanical algorithms, contour/calibration data or artwork assets changed. All changes remain uncommitted on `cinematic-feature` at baseline HEAD `d945e4a`.

## Review captures

[Desktop placeholder](cinematic-desktop.png) · [Mobile placeholder](cinematic-mobile.png) · [Acceleration frame](cinematic-acceleration.png)

## Manual visual review

Refresh the page on the user's existing development server; no server command is needed from the agent.

1. On desktop, select each non-HOME destination and explicitly confirm by the active label, center button, keyboard or ENTER control.
2. Judge the acceleration: restrained silver streaks, sharp wheel/text, smooth shrinking and docking, no literal road/tunnel, no shake or bounce.
3. Look closely at the first and last frames for swapping, flicker, jumps or duplicate wheels. Click the small right-side wheel and confirm it returns continuously at the original selection/angle.
4. Press Escape early and midway through entry. Try repeated confirmation/restore inputs; they must not queue new destinations.
5. Repeat on narrow/short screens, after scrolling, and with the operating system's reduced-motion preference enabled. Check the safe-area corner control and keyboard focus.
6. Resize or switch away during travel; the result must be a usable navigation or destination endpoint.

This prototype is ready for manual review, not final aesthetic approval. Actual physical Android/iOS touch, native Safari, NVDA and VoiceOver checks remain pending, as in the mechanics baseline. Synthetic hiding/protocol touch and Windows WebKit automation do not replace them. Final section content, badge/font refinement, complete pages, routing, sound and deployment remain outside this delivery.
