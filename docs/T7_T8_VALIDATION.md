# T7/T8 validation and handoff — 2026-10-23

T7 is complete for the defined accessibility/mobile baseline. T8's automated cross-browser validation and local handoff are complete. Physical-device and screen-reader checks below remain pending; automation does not establish their results. The user explicitly authorized both phases after approving the unchanged 1–45 CSS-pixel drag band.

## T7 changes

- `SteeringWheelNavigator.tsx`: endpoint arrows use `aria-disabled` instead of losing focus through native endpoint disabling. Their click handlers reject movement beyond the endpoint; opposite arrow keys still work. Native disabling during an owned gesture remains. Help text derives both band limits from `presentation.ts` and explains non-drag alternatives.
- `HorizontalSectionTrack.tsx`: the named section-navigation container is now a `nav` landmark. Label selection, native button activation and the committed Tab stop are preserved.
- `SteeringWheel.tsx`: slider maximum derives from section configuration. Decorative artwork and sibling center-confirmation button are preserved.
- `styles.css`: desktop confirmation controls sit 14px below the entire stationary wheel surface, with space reserved in the navigator. Confirmation feedback participates in normal flow. The existing mobile reflow, compact keyboard badge and 44px minimum auxiliary targets remain.
- `SteeringWheelNavigator.test.tsx`: three additional regressions cover both endpoint-focus/reversal paths and committed-only announcements with configuration-derived help.

Steering math, controller hook, snapping, selection/confirmation rules, artwork, calibration and the approved 1–45px configuration were not changed in this phase. Pre-existing edits, including the header and footer styling, were preserved.

## T8 tooling

- Added exact local dependency `@playwright/test` 1.64.1 and its lockfile entries.
- Added `playwright.config.ts`, `tests/wheel-navigation.spec.ts`, `tsconfig.e2e.json`, and `scripts/playwright.mjs`; updated package scripts and root TypeScript references. E2E tests and configuration are included in `npm run typecheck`.
- The wrapper sets project-local `TEMP`, `TMP`, and `PLAYWRIGHT_BROWSERS_PATH`, builds current source into `.tmp/e2e-build`, and runs an isolated production preview on `127.0.0.1:4173`. It does not reuse an existing server. Browser downloads, profiles, screenshots, traces and reports stay inside `.tmp`.
- Updated the older static/band scripts to derive limits from configuration. They no longer assume an 11px maximum. Calibration was not regenerated.
- Updated README, current context and implementation progress. Earlier geometry reports retain their historical results and are superseded by this report.

## Actual final results

| Check | Result |
|---|---|
| `npm.cmd test` | 127/127 tests passed across 3 files, including the previously corrected three band cases. |
| `npm.cmd run typecheck` | Passed, including E2E source/configuration. |
| `npm.cmd run lint` | Passed, zero warnings. |
| `npm.cmd run build -- --outDir .tmp/audit-build` | TypeScript and Vite production build passed; existing `dist` preserved. |
| `npm.cmd run test:e2e -- --project chromium --grep T7` | Initial T7 gate: 4/4 passed before the full matrix. |
| `npm.cmd run test:e2e` | 43 passed, 2 intentional skips, 0 failures, 0 flaky tests. Final run: 210.4 seconds. |
| `node scripts/verify-wheel-band.mjs` | 7,244 assertions passed against the production build. `externalControlHits` is empty. |
| Syntax checks for `scripts/playwright.mjs` and `scripts/verify-static.mjs` | Passed. The full legacy static verifier was not rerun; Playwright and the band verifier provided current browser evidence. |
| Additional layout captures | 1440×900, 320×600 and 1440×600 had no horizontal page overflow. Desktop, mobile and short-screen screenshots were inspected. |
| Artwork | SHA-256 values match the previous recorded assets; neither image changed. |

Browser engines used on Windows:

| Project | Version | Result |
|---|---|---|
| Chromium | 156.0.8078.4 | 15 passed |
| Firefox | 157.0 | 14 passed; 1 Chromium-only protocol-touch case skipped |
| WebKit | 27.2 | 14 passed; 1 Chromium-only protocol-touch case skipped |

The two skips are capability-specific, not failed primary interactions. Each engine ran the same keyboard, mouse, semantics, focus, scrolling, reduced-motion, resizing, screenshot and band matrix. The additional Chromium case used DevTools touch input for dragging, cancellation and native scrolling outside the wheel. WebKit on Windows is not a physical iOS Safari test.

Coverage includes all five mappings, endpoint clamping and reversal, native activation, Tab/Shift+Tab, visible keyboard focus, label selection followed by explicit confirmation, real GSAP snapping, rapid replacement, confirmation during snapping, repeated Enter, captured movement outside the band, release over the hub without confirmation, Escape, synthetic pointer cancellation, resize rollback, and unchanged URL. No browser runtime exceptions were recorded. Slider values and live announcements retain committed selection during drag previews.

Band automation covers viewport widths 320/1440 and DPR 1/2, all five wheel positions and four contour segments in every engine. Native mouse samples are 2px inside/outside the configured bounds, plus a 20px interior sample. Exact inclusive 1px/45px boundaries remain covered at eight contour segments, five angles and three sizes by the independent geometry tests; the Chrome band verifier additionally exercises exact edges at eight segments.

## Evidence and reproducibility

```powershell
npm.cmd run test:e2e:install
npm.cmd run test:e2e
```

- Final cross-browser report: `.tmp/playwright-report/results.json`.
- Fifteen settled-state PNGs: `.tmp/playwright-results/wheel-navigation-T8-five-e-d7cad-rack-and-stable-screenshots-{chromium,firefox,webkit}/settled-{about,experience,home,projects,stack}.png`.
- Each settled image was compared byte-for-byte with a second capture in the same run. This checks rendering stability; no approved visual-regression baseline was created.
- Current non-focused layout captures: `.tmp/t7-layout-{desktop,mobile,short}.png`; captured from the production build using `.tmp/capture-t7-layouts.mjs`.
- Exact-edge evidence and keyboard-focus image: `.tmp/wheel-band-verification/results.json` and `keyboard-focus.png`.
- Original PNG SHA-256: `568172172d2fe8807b03a0c5f171dff5ef33f0187dc45ef77ed4d0785f077872`.
- Candidate SHA-256: `8f64d15a8a90214184d38403d7163ece82ddd4621e7f3455e921781996e659bd`.

Generated evidence is intentionally ignored by Git and regenerated by local checks. Playwright clears its results directory for a new run, so save evidence before rerunning if comparing runs.

## Findings resolved during validation

The desktop ENTER/rim proximity and endpoint auxiliary-button focus loss from earlier reports are resolved in this phase and verified in all three engines. The dedicated band matrix recorded no auxiliary-control interceptions across its sampled inputs.

An initial Firefox assertion treated a reported target width of `43.999996185302734px` as smaller than its 44px CSS size. A `0.0001px` measurement tolerance now handles that numerical error. An independent native-pointer diagnostic also confirmed that Firefox/WebKit truncate coordinates: a requested `(215.5539, 423.3352)` arrived as `(215, 423)`. Browser samples therefore allow a 2px positioning margin rather than pretending an injected fractional coordinate reached an exact edge. The application hit-test tolerance and geometry were not changed.

The first sandboxed T7 run passed all four cases but could not finish cleaning up its Vite child process. That specifically identified local test server was stopped. Subsequent complete runs used approved process permissions and exited normally; all generated files remained local.

## Remaining manual checks

No physical touch hardware or screen-reader session was available. These checks remain pending:

| Environment | Manual acceptance check |
|---|---|
| Physical Android Chrome | Drag both ways from multiple rim positions, reverse at both limits, release outside, cancel via app switching, and verify no accidental confirmation. |
| Physical iPhone/iPad Safari | Repeat drag/capture/cancellation checks, rotate the device, test viewport resizing and scroll outside the wheel using touch. |
| NVDA with Firefox; VoiceOver with Safari | Verify meaningful slider values, Home-key explanation, quiet drag previews, one committed-selection announcement, confirmation feedback, normal Tab order and retained endpoint-arrow focus. |
| Native Safari | Confirm the Windows WebKit automation results in the actual target browser and OS. |

Final artwork/font refinement, full responsive art direction, real contact destinations, portfolio pages, routing, cinematic transitions and deployment remain outside this isolated-mechanics delivery.

## Local Git

The repository was already on `main` with uncommitted changes when T7/T8 began. Those changes were preserved. T7/T8 source, tests, tooling and documentation remain uncommitted for review. No repository initialization, commit, remote configuration, push, publication or deployment occurred.
