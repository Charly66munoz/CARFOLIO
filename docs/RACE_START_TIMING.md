# Race Start entrance and startup timing — 2026-10-26

The only application change is the START button's opacity animation in `src/styles.css`: 0 → 1 over 600 ms with `ease-out`, followed by the existing 2 s pulse between 1 and 0.7. The delayed pulse has no backwards fill, so it does not contribute opacity during the entrance. Reduced motion sets opacity to 1 and removes both animations. Activating START during the entrance still works and retains the existing disabled presentation.

The light timers, cinematic timeline, interaction gate, focus, persistence, layout, typography, underline and wheel mechanics are unchanged. No loading or timer correction was justified by the measurements.

## Measurement method

Measured the existing implementation before editing application code, then repeated browser measurements after the CSS change. Used headless Chromium at 1440 × 1000 on this Windows workspace, real timers and local HTTP, without network/CPU throttling. These are local observations, not hosted-service or physical-device benchmarks.

Browser instrumentation used `performance.now()`, Navigation/Resource/Paint Timing, a long-task observer, a MutationObserver for overlay mount, light activation, START availability and `inert` removal, and requestAnimationFrame samples for opacity and streak visibility. After handoff, a real ArrowRight input verified that HOME's wheel accepted input.

START availability means the enabled native button has mounted and received focus. It is separate from reaching full opacity. HOME availability means the overlay has been removed and the underlying interaction gate released; a following frame and keyboard input were also recorded.

Developer-server setup and production builds happen before browser navigation and are excluded from page timing. Fresh browser contexts prevent the 15-minute expiration from silently bypassing the intro, except in the explicitly identified return-visit checks.

The post-change normal-motion capture deliberately waits 900 ms after START availability to observe the complete entrance and beginning of the pulse. This is measurement-controlled visitor time, not an application wait. The pre-change run clicked as soon as the automation reached START.

## Before-change breakdown: prepared development server

All absolute times below start at browser navigation. This run used an already prepared Vite server and a fresh browser context.

| Requested measurement | Observed | Explanation |
|---|---:|---|
| 1. Race Start appears | DOM at 221 ms; first contentful paint at 404 ms | Initial module loading, React commit, layout and paint. First overlay frame callback was at 226 ms, which precedes actual contentful paint. |
| 2. Four automatic lights | First at 293 ms, fourth at 3,297 ms: 3,004 ms between them | Intentional 0/1/2/3 s schedule, not a four-second countdown. |
| 3. PRESS TO START available | 3,297 ms | Same commit as the fourth light; no extra timer. |
| 4. START click → cinematic begins | Click at 3,383 ms; starting commit at 3,393 ms: 10 ms | Timeline setup occurs in the layout effect of that commit. First visible streak at 3,524 ms: 141 ms after click, including the designed 120 ms streak offset. |
| 5. Cinematic duration | 1,563 ms from starting commit to HOME release | Configured timeline is 1,500 ms; the difference is scheduling/render/React handoff overhead. |
| 6. HOME fully interactive | Gate released at 4,955 ms; following frame at 5,011 ms; keyboard response verified by 5,069 ms | No post-transition readiness timer. |

Visitor/automation time between START availability and click was 86 ms in this run. The approximately five-second entry therefore comes mainly from the 3 s light sequence and 1.5 s cinematic, with initial loading, rendering and visitor response accounting for the remainder.

## Development-only cold preparation

An intentionally empty, project-local Vite dependency cache produced a much slower first request: overlay DOM at 4,827 ms, contentful paint at 5,024 ms, START at 7,914 ms and HOME release at 9,610 ms. Resource Timing showed development modules waiting approximately 4.45–4.56 s before their responses completed. The server had already started in 329 ms; the additional preparation occurred on the first browser request.

A subsequent development restart using the normal cache location logged `Re-optimizing dependencies because vite config has changed` and reproduced approximately 4 s of module-response delay. The next browser visit on that same server mounted the overlay at 219 ms and reached START at 3,295 ms. This identifies cold Vite processing as a separate tooling delay, not an extra Race Start timer. The temporary benchmark server uses its own port/configuration, so its cache invalidation is not evidence that ordinary reloads always incur that work.

No optimizer settings, dependency versions or application initialization behavior were changed. Judge normal visitor loading with a production build, rather than adding speculative application loading logic in response to cold development preparation.

## Final production build measurements

Measured separately with `NODE_ENV=production`, after active browser tests had finished. The production JavaScript bundle was 323.36 kB before compression. Two fresh-browser visits, on the first request and then a prepared preview server, gave:

| Requested measurement | Observed production result |
|---|---:|
| 1. Overlay appears | DOM at 93–103 ms; contentful paint at 280–296 ms |
| 2. Four automatic lights | Same 0/1/2/3 s timer schedule; observed first light at 272–288 ms and fourth at 3,164–3,184 ms |
| 3. START available | 3,164–3,184 ms after navigation; full-opacity entrance endpoint 600 ms after its animation starts |
| 4. Click → cinematic | Starting commit after 8–9 ms; first visible streak after 143–156 ms, including the designed 120 ms offset |
| 5. Cinematic duration | 1,574–1,596 ms observed for the configured 1,500 ms timeline |
| 6. HOME interactive | 5,726–5,777 ms after navigation; following frame at 5,780–5,785 ms; successful keyboard response recorded by 5,840 ms |

These captures deliberately include 980–989 ms between button availability and click (the requested 900 ms observation pause plus automation/input overhead). Subtracting that separately measured interval gives **4,746–4,788 ms** to HOME release with no visitor wait. No 600 ms interaction lock was introduced by the fade.

The first light's zero-delay callback can be delayed by initial rendering, so the observed interval from the first to fourth DOM mutation was 2,892–2,896 ms. This does not change the timer schedule: the fourth still occurs about three seconds after initial effects begin. Initial long tasks reached about 100–112 ms in the normal-motion production runs. The JavaScript response completed at 40–55 ms and the wheel image at 102–114 ms, well before START availability; neither gated the cinematic or HOME handoff.

A valid-expiration return visit released HOME at 86 ms, with contentful paint at 204 ms and the keyboard probe verified by 334 ms. The intro was absent. Reduced motion retained the countdown, displayed START immediately at opacity 1, and used the configured 150 ms reveal; actual commit-to-HOME release was 243 ms, including rendering/handoff overhead. No console/runtime/request errors were recorded in these timing runs.

## Intentional timeline and execution costs

- Light activation is scheduled at 0, 1,000, 2,000 and 3,000 ms after the effect starts. Cleanup already cancels all four timers, including the Strict Mode trial mount.
- At the fourth light, START mounts, is enabled and receives focus. Its new 600 ms fade does not defer activation or start an additional countdown.
- An accepted START immediately schedules the starting commit and fifth light. The existing streaks start at timeline time 120 ms. Their final 450 ms fade starts at 950 ms with five 20 ms stagger offsets, giving a 1,500 ms total timeline.
- The overlay's final 250 ms fade overlaps the timeline from 1,250 to 1,500 ms; it is not appended to the cinematic.
- The completion fallback is at the timeline duration plus 500 ms. Normal completion clears it. Observed completion around 1.5–1.6 s confirms that the fallback is not routinely adding a half-second hold.
- HOME and its existing wheel controller are mounted at the same time as the overlay. The intro only blocks their interaction with `inert`; no second HOME initialization is scheduled after the transition.
- Long tasks in these captures include initial work around 60–120 ms and frames/handoff work around 50–80 ms. They are real rendering/execution costs, but they do not account for a multi-second application stall. The measurements do not justify changing approved visuals or rewriting the cinematic.

## Recommendation

Keep the approved timings for this change. There is no unexpected application wait to remove. A visitor who takes an additional 1–2 s to activate START naturally reaches HOME in about 6–7 s. The new entrance may influence when a visitor chooses to click, but it does not lock the button for 600 ms.

If a shorter deliberate entry is later desired, consider separately approving a 1.2 s startup cinematic instead of 1.5 s, saving 300 ms while retaining the one-second light cadence. That adjustment has not been applied. The existing valid 15-minute expiration already skips the entire intro for returning visits.

## Validation and evidence

Raw local captures and the temporary browser runner are under `.tmp/race-start-timing/` and `.tmp/measure-race-start.mjs`. The `before` and `after` development captures are valid development measurements. The first mixed development/build runner retained development `NODE_ENV` for its bundled runs; those bundled captures are excluded from production conclusions. The separate `production` capture explicitly sets `NODE_ENV=production` before building.

Validation completed:

- TypeScript project build (`tsc -b`) and ESLint with zero warnings: passed.
- Vitest: all 149 tests passed across five files, including timer cleanup, duplicate activation, storage, handoff and fallback coverage.
- Production Vite builds: passed. Timing results above use the separate production-only build.
- Race Start and existing cinematic browser suites: **35 passed**, **1 intentionally skipped** (Chromium-only protocol touch in WebKit). Chromium and WebKit passed the new opacity progression/pulse test, activation during entrance, reduced motion, focus, persistence, HOME handoff and existing cinematic regression checks.
- Firefox: **18 failures before application load**, all `browserContext.newPage: Target crashed`. Repeating with the previously documented local proxy-bypass configuration reproduced the same startup failure. Firefox application behavior remains unverified in this environment. The preexisting afterEach hook also reports an uninitialized error list when page creation fails; no application assertion was reached. No global browser/network setting was changed.
- `git diff --check`: passed; Git printed existing CRLF conversion notices for other preexisting modified files.

The Windows test preview processes remained alive after the test cases finished. Stopped only the two preview PIDs created by these test runs so Playwright could finalize its reports. No preexisting development server was stopped.

Browser reports are `.tmp/playwright-report/results.json` and `.tmp/race-start-timing/firefox-results.json`. Artifacts, caches, temporary configs and browser profiles remain project-local and ignored by Git.

## Files and local Git status

Task changes only:

1. `src/styles.css` — opacity entrance, delayed existing pulse and explicit visible opacity for disabled/reduced-motion states.
2. `tests/race-start.spec.ts` — browser coverage for fade-to-pulse ordering and activation during the entrance; explicit reduced-motion opacity check.
3. `docs/RACE_START_TIMING.md` — measurements, findings and validation.

Existing uncommitted work was retained. No commit, branch change, dependency installation or external write was performed. Closing Git status:

```text
 M docs/RACE_START_IMPLEMENTATION_PLAN.md
 M src/App.tsx
 M src/features/cinematic-transition/CinematicLayer.tsx
 M src/features/cinematic-transition/useCinematicTransition.ts
 M src/styles.css
 M tests/cinematic-transition.spec.ts
 M tests/wheel-navigation.spec.ts
 M vite.config.ts
?? docs/RACE_START_TIMING.md
?? src/features/cinematic-transition/speedStreaks.ts
?? src/features/race-start/
?? tests/race-start.spec.ts
```
