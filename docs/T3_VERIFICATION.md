# T3 verification — 2026-10-22

T3 pure mechanics is complete following the user's explicit request to start it. It is independent of the unresolved T2 asset gate: no artwork edits, application rotation, drag handlers or animation controller were added. The screen remains the T2 static preview.

## Delivered files

- `src/features/wheel-navigation/sections.ts`: derives HOME angle, minimum/maximum angles and equal slot step from the existing ordered section definitions. The section-angle pairs remain the single source of truth.
- `src/features/wheel-navigation/wheelMath.ts`: clamping, signed shortest angular delta, screen-coordinate polar angle, incremental rotation, nearest section with ties toward HOME, annular hit testing, fractional index and the approved direct track-position equation.
- `src/features/wheel-navigation/__tests__/wheelMath.test.ts`: numerical acceptance tests.
- `vitest.config.ts`: Node test environment, explicit mathematical-test discovery, project-local cache.
- `tsconfig.node.json`: includes the test-runner configuration in strict type checking.
- `package.json` and `package-lock.json`: Vitest 5.0.5 and `npm.cmd test` (`vitest run`). Installed locally with `.npm-cache` and `.tmp`; no global changes. Existing Node 22.19.0 and Vite 8.3.5 meet [Vitest's documented requirements](https://vitest.dev/guide/).
- `README.md` and `IMPLEMENTATION_PLAN.md`: current authorization, progress, commands and limitations.

## Checks actually run

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

## Remaining issues and scope

The original asset SHA-256 remains `568172172d2fe8807b03a0c5f171dff5ef33f0187dc45ef77ed4d0785f077872`, matching T2. The opaque disc, baked lighting and hub/rim calibration remain unresolved. The annulus helper accepts supplied measured radii; its tests certify the mathematical bounds only. Provisional ratios and the candidate hub in `presentation.ts` remain unchanged and unapproved for actual interaction.

The helpers are not yet wired into React controls. This phase does not claim browser drag behavior, pointer capture, functional snapping, visual hub stability, accessible slider operation or live wheel/track synchronization. Those depend on later tasks and applicable acceptance gates. No new browser or physical-device tests were run for these pure calculations. T4–T8 have not started.

All changed files and generated artifacts remain inside `carfolio`. No remote, publication, deployment or Git changes were made.
