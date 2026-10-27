# Application health audit and safe fixes

> Historical audit checkpoint: 2026-10-25, before Race Start implementation. Its measurements, safe-fix evidence and limitations remain valid only for that checkpoint. The startup recommendations below were superseded by the [final Race Start contract](RACE_START_IMPLEMENTATION_PLAN.md), including fixed light cadence, no resource-readiness gate and 15-minute localStorage expiry. Race Start is now implemented; see [latest timing and incomplete validation](RACE_START_TIMING.md). Old branch/status snapshots are historical, not current workspace state.

Date: 25 October 2026, America/Buenos_Aires. Scope: technical audit, isolated safe fixes, cinematic reuse assessment and a Race Start implementation proposal. **The Race Start loader is not implemented.**

## 1. Baseline and scope

- Branch: `cinematic-feature`.
- Commit: `d945e4aba31acb72a665bf1e757c32cb7fb527ef`.
- Working tree was already dirty: 11 modified tracked paths and eight untracked status entries, including the cinematic prototype and WebP artwork. No branch, commit, history, remote, dependency or user-server changes were made.
- Initial hashes and Git status of all 71 tracked/nonignored files were captured in `.tmp/health-race-start-audit/initial-state.json` before editing.
- Read `AGENTS.md`, `PROJECT_CONTEXT.md`, `IMPLEMENTATION_PLAN.md` and the current source. Historical documentation describes older phases; the current application includes the cinematic placeholder prototype and imports the WebP.

Available scripts: `dev`, `typecheck`, `test`, `test:e2e`, `test:e2e:install`, `lint`, `build`, `preview`. The install script was not run. Installed CLIs were invoked directly with project configurations; temporary builds and browser profiles/reports stayed within the project.

Current structure:

```text
App
  useCinematicTransition
  navigation-scene
    SteeringWheelNavigator / useWheelNavigation
      HorizontalSectionTrack
      SteeringWheel / WheelArtwork
  section-scene / SectionPlaceholder
  CinematicLayer
    speed streaks
    decorative wheel carrier
    floating restore control
```

Runtime dependencies are React, React DOM and GSAP, all used. Vite, TypeScript, Tailwind, lint and test tools are development dependencies. No unused runtime library or broken import was confirmed.

## 2. Application health report

**Overall technical status: Minor issues. Development verdict: READY WITH MINOR ISSUES.**

There is no confirmed application blocker to further local feature development. The checksum issue below has been corrected. Resource readiness and recovery are requirements to address when implementing startup, not reasons to rewrite the validated wheel controller.

### Static validation

The following checks passed both before and after the checksum correction:

| Check | Actual result |
|---|---|
| TypeScript, `tsc -b` | Passed |
| ESLint, `eslint . --max-warnings 0` | Passed |
| Vitest, existing configuration | 130 tests passed in four files |
| Vite production build | Passed, 37 modules |

The post-fix build has the same asset names, byte lengths and contents as the pre-fix production build. The metadata correction introduces no application bundle change.

### Browser validation

Existing Playwright suites were run against an isolated production preview, with project-local browser profiles, one worker and external requests blocked through a local proxy. Results across completed executions:

| Engine | Passed | Expected capability skips |
|---|---:|---:|
| Chromium 156.0.8078.4 | 24 | 0 |
| Firefox 157.0 | 23 | 1 |
| WebKit 27.2 | 23 | 1 |
| Total | **70** | **2** |

The skipped case uses Chromium-only CDP touch input; it is not a physical Firefox/Safari touch test.

Coverage includes exact five-angle selection, HOME defaults, track centering within 1 CSS px, drag capture and release, limits, cancellation, explicit confirmation, keyboard focus, reduced motion, 320 px overflow/scrolling, contour boundaries at multiple viewport/DPR combinations, and protocol touch. Cinematic cases cover duplicate guards, HOME confirmation, entry/return timing, fixed rotation, handoff continuity, all four placeholders, focus/scroll restoration, Escape, resize, preference changes and synthetic hiding. Both entry and return interruption are exercised. Screenshot continuity tolerances in the existing tests were not relaxed.

Important execution distinction: the initial combined sweep returned 47 passes, 24 Firefox failures and one skip. Every Firefox failure was `browserContext.newPage: Target crashed`, before application navigation. A separate probe reproduced the crash inside the execution sandbox and succeeded outside it. The entire Firefox project then passed in the approved context: 23 passes and one expected skip. These were environment failures, not ignored application failures.

The initial sandboxed runner also stalled while stopping its owned preview after its cases finished. The preview process was identified by its exact command line and closed; this allowed the runner to write its final failure report. The successful Firefox retry closed its own preview normally. No user-managed server was running on the usual project ports, and none was managed during the audit.

The original standalone contour runner's hand-written CDP transport exited with an unsettled top-level await. Its assertion body was then executed through a temporary Playwright/CDP adapter against the fresh production build, without changing assertions or calibrating the contour. **All 7,244 assertions passed**, with zero external-control interceptions. The source verification script was not refactored.

Node emitted a `NO_COLOR` / `FORCE_COLOR` environment warning in the browser runner. This is harness output, not a browser console or React warning; no project configuration was changed to suppress it.

### Runtime, cleanup and memory

Fifteen passive performance loads and fifteen independent input probes completed with no page exceptions, browser console errors/warnings or failed HTTP requests. The normal-resource request log contains no external HTTP requests.

Source inspection confirms cleanup of the wheel controller's pending frame, tween, pointer capture, ResizeObserver, media and window/document listeners. The horizontal track disconnects its ResizeObserver. The cinematic controller reverts its GSAP context on unmount and navigation return, and removes its global/media listeners. The audit did not find a confirmed missing cleanup that could safely justify editing those controllers.

A fresh post-fix browser exercised 43 complete entry/return cycles under reduced motion. After GC at cycles 3, 23 and 43:

| Counter | Cycle 3 | Cycle 23 | Cycle 43 |
|---|---:|---:|---:|
| DOM nodes | 192 | 192 | 192 |
| JS event listeners | 208 | 208 | 208 |
| JS heap used, decimal MB | 3.64 | 3.94 | 4.06 |

No node/listener accumulation or runtime exception occurred. The approximately 0.42 MB heap increase is an observation, not proof of a leak or proof that none exists. Long-session heap attribution remains unverified; it is not currently a demonstrated blocker.

### Confirmed recovery gaps

Fault injection was isolated to browser request interception, without changing application files:

- Blocking the current WebP produces a missing wheel while text controls and keyboard selection remain functional. `image.complete` is true but `naturalWidth` is zero. There is no explicit artwork error/retry UI today.
- Blocking the main JavaScript leaves `#root` empty with no visible text. A React-only loading UI would not cover that failure.
- No complete startup readiness signal exists. `window.load` fires before the image is ready, and the cinematic phase is unrelated to resource preparation.

These gaps are incorporated into the proposed startup plan. Adding recovery/UI or a boot shell would change application behavior and belongs to the future feature, so none was automatically implemented as a technical cleanup.

Evidence note: the first lifecycle script retained an obsolete PNG fault-interception pattern. Its wheel fault entry did not block the WebP and is not used as failure evidence. The corrected WebP-specific run is saved separately in `faults.json`; the memory counters in `lifecycle.json` remain valid.

## 3. Current loading performance

Fresh production build, real headless Chromium, five runs per passive scenario, plus five independent selection probes per scenario. Desktop: 1440 × 900 / DPR 1. Mobile: 390 × 844 / DPR 3 with touch, CPU ×4, 1.6 Mbps down, 750 kbps up and 150 ms configured latency. All values below are median milliseconds from navigation start.

| Metric | Desktop cold | Desktop warm | Mobile cold/throttled |
|---|---:|---:|---:|
| FCP | 116 | 136 | 1,216 |
| LCP, final candidate = wheel | 140 | 152 | 2,344 |
| Wheel `decode()` resolved | 103.8 | 122.1 | 2,307.6 |
| DOMContentLoaded end | 39.4 | 14.2 | 1,021.3 |
| Window load end | 39.5 | 14.5 | 1,021.3 |
| First accepted selection probe | ≤48.7 | ≤21.4 | ≤1,091.3 |
| Sum of long tasks | 0 | 77 | 219 |
| Longest task | 0 | 77 | 133 |
| CLS | 0 | 0 | 0 |

The selection probe observes the first navigator commit, sends a synthetic ArrowRight and records the effective selected-index change in a separate run. It is an upper-bound functional readiness observation, not standard TTI/INP or proof of the first visible frame. Actual mouse/touch behavior is covered by the browser regressions. No exact React-only initialization duration is claimed.

The image finishes transferring around 2,300 ms in mobile; its transfer interval is about 1,230 ms, and `decode()` resolves roughly 7.8 ms after reception. The request is discovered around 1,068 ms, after client initialization. These are remaining optimization opportunities, but no major startup defect must be fixed before planning a lightweight introduction. Do not add a fixed loading delay to compensate for normal client initialization.

Desktop warm LCP is 12 ms above cold in this small sample, within the observed presentation variability; do not infer that caching is detrimental. Warm responses are revalidated with 304, with approximately 612 HTTP bytes including headers, compared with 325,198 bytes cold. Data-URL cache events are not counted as HTTP cache hits. Browser cache was cleared for cold loads; OS caches were not.

The preview is local HTTP. No hosting, DNS, TLS or CDN latency was measured. Navigation Timing reports loopback TTFB even under this throttling, so it is not presented as remote TTFB. Development-mode performance was not measured in this task because no existing dev server was available; no dev server was started. All numbers above come from production, without HMR instrumentation.

| Initial asset | Current build size | Behavior |
|---|---:|---|
| Wheel WebP, 1254 × 1254 | 212,252 B | Eager mounted image; one network request shared by main and carrier copies |
| JavaScript | 320,651 B | One production bundle, gzip in preview |
| CSS | 18,956 B | One stylesheet, gzip in preview |
| Graphite / silver SVG | 700 / 691 B source | Inlined into bundle, with blur filters |
| Shadow / indicator SVG | 678 / 254 B source | Inlined into bundle |
| Web fonts | 0 downloaded | System fallback stack |

The original 1,663,940-byte PNG remains intact but is not requested. No future pages, audio, video or separate cinematic image are downloaded. Filters incur rendering work, but their individual impact was not isolated; no broad visual or framework optimization is justified by this audit.

## 4. Safe fixes report

**One source fix applied.**

| Item | Finding and action |
|---|---|
| Original problem | The current verifier hashes the WebP, but `WHEEL_CONTOUR_ASSET_SHA256` still held the old PNG hash. The checksum guard would report a stale contour even though its outline was unchanged. |
| Root cause | The asset import and checker were switched to WebP without updating the verification metadata. |
| File changed | `src/features/wheel-navigation/wheelContour.ts`, checksum line only. |
| Correction | Replace PNG SHA-256 `8f64d15a…` with current WebP SHA-256 `8e5f6cd6…`. No recalibration. |
| Safety proof | Browser decoding compared all 1,572,516 alpha pixels: zero differences, maximum alpha delta zero, both images 1254 × 1254. Replacing the new checksum with the old one reconstructs the complete original file exactly, including line endings and every contour coordinate. |
| Validation | 7,244 contour assertions, 130 unit/integration tests, type check, lint, production build and cross-browser cases above. Pre/post production assets are identical. |

No drag math, hit region, section mapping, image, cinematic controller, visual design, dependency or routing behavior was changed. No additional safe defect was confirmed that warranted a source edit.

## 5. Cinematic transition reuse assessment

The current flow is controlled by `useCinematicTransition`, `CinematicLayer` and `App.confirm()`, using GSAP rather than CSS keyframe timelines. `WheelArtwork` is shared decoration for the main wheel and carrier. Six CSS-styled spans provide speed streaks; their opacity/translation/scale/blur are animated by GSAP.

The full transition is not a suitable startup primitive. It requires a non-HOME destination, existing wheel and dock geometry, section content and navigation focus/scroll bookkeeping; `enter('home')` deliberately rejects entry. Reversing or faking a destination would couple startup to those assumptions.

Recommend extracting only the existing streak DOM and its three tween calls, preserving normal timing and scoped ownership. Startup then owns a small separate timeline for lights-out, the shared effect and HOME reveal. Use the same easing/motion language and cleanup pattern. No extraction or cinematic modification was performed during this audit.

## 6. Race Start implementation proposal

The concrete file-level proposal, state machine, readiness contract, sequence, measurable acceptance criteria, tests and open decisions are in [Race Start implementation plan](RACE_START_IMPLEMENTATION_PLAN.md).

Key recommendations:

- Tiny pre-React shell plus CSS-built five-column assembly; proposed two red lenses per column, no heavy asset.
- A small startup hook independent of the existing navigation controller. Keep the real HOME mounted at 0° and temporarily inert.
- Readiness based on valid decoded WebP, committed handlers, applied CSS and measured layout. Lamp sequencing never establishes readiness.
- Finish remaining lamps immediately on early readiness. Offer a native, focused-visible START button; extinguish all lamps and acquire a synchronous one-shot guard on activation.
- Proposed user-triggered acceleration around 1.5 s, including a 250 ms final fade; reduced motion at most 150 ms. This intentional post-activation ceremony is separate from actual loading and requires product approval.
- Bounded waiting with actionable recovery, including missing-JS recovery independent of React. No automatic audio.
- Prefer session-only return-visit behavior if approved. No persistence has been added.

Open decisions are called out rather than silently implemented: full/compact timing, exact light housing, Skip affordance, returning-visitor policy, slow-loading threshold and any degraded text-only mode.

## 7. Remaining work and readiness verdict

**Actual blockers:** none confirmed for continuing the local prototype.

**Before shipping startup:** implement and validate the proposed resource/failure contract and avoid independent animations owning the same DOM styles. The plan itself does not authorize that implementation.

**Nonblocking debt/limits:** historical phase statements coexist in older documents; standalone CDP runner reliability; modest un-attributed heap growth in a short cycle test. These did not justify broad refactoring.

**Optional performance work:** test earlier wheel discovery and delivery caching when hosting is selected. Preserve geometry and visual quality; no package/framework migration is indicated.

**Not completed or not claimable:** physical mobile tests, native Safari, screen-reader validation, long-session heap attribution, final aesthetic approval, production-hosting measurements and an external dependency vulnerability audit. Installed dependencies were not upgraded or externally audited.

## 8. Files and Git

Changes made by this task only:

1. `src/features/wheel-navigation/wheelContour.ts` — one checksum metadata correction.
2. `docs/APPLICATION_HEALTH_AUDIT.md` — this report.
3. `docs/RACE_START_IMPLEMENTATION_PLAN.md` — the implementation-ready proposal, without implementation.

Diagnostics/builds are ignored temporary files under `.tmp/health-race-start-audit/`. Existing source, documents and user changes are preserved. No dependency installation, Git branch/history change, commit, push or deployment occurred.

The final machine-checked preservation record is `.tmp/health-race-start-audit/preservation.json`. It compares the initial file hashes and lists new files. Current branch and commit remain the baseline above. The working tree remains uncommitted and intentionally dirty; its exact status is recorded below at audit closure.

### Evidence files

All paths below are relative to `.tmp/health-race-start-audit/`:

- `initial-state.json`, `preservation.json`: original hashes and final preservation check.
- `results.json`, `summary.json`: 15 passive timing runs, 15 independent input probes and medians.
- `browser-results.json`: original 47-pass / 24-environment-failure / one-skip report.
- `firefox-retry.json`, `browser-summary.json`: successful Firefox retry and per-engine accounting. Native reporter files also remain in the nested temporary output directory.
- `geometry.json`, `contour-before.ts`: full alpha-equivalence check and original contour file.
- `band/results.json`: 7,244 successful existing contour assertions using the temporary transport adapter.
- `lifecycle.json`: current 43-cycle memory observation; use `faults.json` for corrected WebP/JavaScript failure injection.
- `build/`, `post-fix-build/`: isolated production builds for identity comparison.

### Final Git status

See the exact closing status appended below. Preexisting changes are not attributed to this audit.

```text
 M IMPLEMENTATION_PLAN.md
 M PROJECT_CONTEXT.md
 M README.md
 M docs/static-verification.json
 M scripts/verify-wheel-band.mjs
 M src/App.tsx
 M src/features/wheel-navigation/SteeringWheel.tsx
 M src/features/wheel-navigation/SteeringWheelNavigator.tsx
 M src/features/wheel-navigation/wheelContour.ts
 M src/styles.css
 M tests/wheel-navigation.spec.ts
 M vitest.config.ts
?? docs/APPLICATION_HEALTH_AUDIT.md
?? docs/CINEMATIC_PROTOTYPE.md
?? docs/RACE_START_IMPLEMENTATION_PLAN.md
?? docs/cinematic-acceleration.png
?? docs/cinematic-desktop.png
?? docs/cinematic-mobile.png
?? src/assets/steering-wheel-transparent-candidate.webp
?? src/features/cinematic-transition/
?? src/features/wheel-navigation/WheelArtwork.tsx
?? tests/cinematic-transition.spec.ts
```
