# Targeted pointer corrections ? 2026-10-23

Only the two user-authorized corrections were applied. This record supersedes earlier 7px boundary descriptions; older verification artifacts remain historical evidence.

## Changes

- `presentation.ts`: configurable tolerance changed from 3 to 5 CSS pixels per side. The existing 1px reference at radius `0.425 ? stage width` yields an 11px total band (radius ?5.5px). Tolerance stays fixed in CSS pixels as the reference radius scales.
- `SteeringWheel.tsx`: presentation-only capture handlers mark pointer input before eligibility testing, including excluded interior presses, and clear the marker for keyboard input or blur.
- `styles.css`: suppress the center button's focus outline only while marked as pointer input. The slider's existing scoped focus-visible treatment and all other keyboard focus styles remain.
- Updated the boundary unit cases and static inspection script to use 11px. README and current reference descriptions reflect the new tolerance.

## Exact outline source

Before the correction, `.wheel-surface:focus-visible:not([data-input='pointer'])` rendered a solid 2px silver circle. The controller only marked eligible rim presses as pointer input. In Chrome, keyboard focus followed by an excluded interior click retained focus-visible without that marker. This was reproduced on the previous build. Marking pointer input in the presentation capture phase fixes the cause without changing drag eligibility or keyboard navigation commands.

## Verification

- `npm.cmd test`: 123 tests passed; includes mathematical, controller, selection, snapping and explicit-confirmation regression cases. Final run also includes expanded-band ?5px acceptance and ?6px rejection assertions.
- `npm.cmd run lint`: passed, zero warnings.
- Production build plus TypeScript passed with output restricted to `.tmp/audit-build`; existing `dist` and both source PNGs were preserved.
- Temporary headless Chrome loaded intercepted local build files; no development server was started. The browser profile and evidence remain under `.tmp`.
- 96 browser assertions passed: real mouse initiation at radius ?5 CSS px and rejection at ?6, widths 1440/320 and DPR 1/2; continuous angle samples at 5/10/15/20 degrees while outside the initiation band; PROJECTS snapping; no gesture confirmation; limits ?36 degrees; pointer outline suppression after keyboard focus; visible Tab focus restoration and Enter confirmation; protocol touch initiation and outline suppression.
- Browser evidence: `.tmp/audit-evidence/pointer-corrections.json` and `pointer-corrections.png`; harness: `.tmp/boundary-browser.mjs`. Protocol touch does not establish physical-device behavior. An initial harness run represented held mouse moves incorrectly; after correcting that and its expected reset target, the complete assertion set passed.

## Known issues deliberately left open

1. Desktop instructions/auxiliary controls overlap the lower independent initiation circle. A gesture attempted there can hit ENTER instead. This correction neither changes ENTER layout/confirmation nor claims the overlap is fixed.
2. Reaching an endpoint through a focused auxiliary arrow can disable that button and move browser focus to body. Keyboard command logic is unchanged; this remains a documented audit finding, not a claimed fix.
3. Physical touch devices, Firefox, Safari/WebKit and screen-reader validation remain pending.

No artwork, section mapping, snapping implementation, navigation architecture or auxiliary control layout was changed. No dependencies were installed; no Git repository was initialized, and no remote action was performed.
