# Project Context — Porsche GT3 Steering-Wheel Interactive Portfolio

## 1. Project goal

We are designing a personal portfolio for **Agustín López, Software Developer**, featuring an unconventional navigation experience inspired by the design of Porsche sports cars.

The core idea is to replace conventional navigation with a **steering wheel inspired by the Porsche 911 GT3 RS**. Visitors should be able to rotate the wheel with a mouse or touch gesture to select portfolio sections.

The website should convey:

- Elegance and minimalism.
- Premium visual quality.
- A sporty automotive identity.
- Smooth, precise, cinematic animations.
- A memorable, interactive, yet intuitive user experience.

The portfolio should **not** feel like a video game or driving simulator. Automotive inspiration should be integrated into a modern, professional, sophisticated interface.

## 2. Design created in Figma

We have already created a Figma design file:

**Agustín | Interactive Portfolio**

Figma URL:

https://www.figma.com/design/oEXjYLVP8tfpWG5PO16x1o

We initially built Landing V1, then iterated through V2/V3, introducing the sports steering wheel, the approved visual direction, and horizontal navigation.

### Current Figma state

Five visual screens represent the five steering-wheel positions:

| Section | Wheel angle | Position |
|---|---:|---|
| ABOUT | -36° | Far left |
| EXPERIENCE | -18° | Left |
| HOME | 0° | Center / initial |
| PROJECTS | +18° | Right |
| STACK | +36° | Far right |

These Figma frames are **static visual states**. The local prototype now implements dragging, snapping, keyboard selection and explicit confirmation (T1–T6, 2026-10-23). Cinematic entry into four placeholders is implemented; real portfolio section content and routing remain deferred.

Text, layouts, and backgrounds are editable in Figma. The detailed steering wheel is a generated raster visual asset based on our reference—not a true 3D model or an assembly of independently editable mechanical parts.

## 3. Visual identity and approved color palette

The visual direction is primarily inspired by the Porsche 911 and GT3 RS.

| Color | Hex | Purpose |
|---|---|---|
| Carbon black | `#101114` | Primary background |
| Graphite | `#22252A` | Surfaces and depth |
| Silver gray | `#A8ADB4` | Secondary details and metallic accents |
| Ice white | `#F1F0EC` | Primary headings and text |
| Sports red | `#C62832` | Interaction and accent details |

Keep this palette consistent throughout the portfolio.

Red should be used sparingly: active indicators, steering-wheel details, underlines, and microinteractions. Avoid large red backgrounds.

### Lighting and atmosphere

The background should not be completely flat black.

We chose subtle, diffused lighting behind the steering wheel, with restrained graphite and silver-gray reflections to suggest depth.

The wheel should feel like a physical object floating in a dark photography studio.

**Do not place a complete car cockpit, road, or tunnel on the initial screen.**

## 4. Main steering wheel

The visual reference selected by the user is the **Porsche 911 GT3 RS steering wheel**.

The user provided a photograph to establish its look.

Desired visual details:

- Thick, sporty steering-wheel rim.
- Dark Alcantara-like material.
- A red center-alignment stripe at the 12 o'clock position.
- Sporty buttons and controls.
- Metallic spokes and details.
- Realistic depth, materials, and reflections.
- Front-facing view.

It does not need to be 100% photorealistic. The agreed direction is **premium semirealism**, closely resembling the GT3 design.

The wheel is the main visual element of the Landing screen.

Figma currently contains a recreation with the red stripe and Porsche crest. We previously considered replacing the crest with a custom **AL** monogram to give the published portfolio its own identity and avoid implying that it is an official Porsche website. The final public-facing badge remains open for review.

### Positioning

- Large wheel, horizontally centered.
- Below the navigation menu.
- Dark background with subtle lighting.
- No competing visual elements.
- Its **visual center must remain fixed while rotating**.

## 5. Horizontal navigation — Final decision

We initially considered a vertical stack of sections, but decided to replace it with **horizontal navigation**.

**Approved order (left to right):**

`ABOUT | EXPERIENCE | HOME | PROJECTS | STACK`

This allows the wheel to turn naturally **both left and right** from its initial HOME position.

### HOME is the initial state

The mounted HOME navigation initializes as follows (Race Start may temporarily cover it; see Section 16):

- HOME is selected.
- Steering-wheel rotation is 0°.
- The red alignment stripe points straight up.
- HOME is centered in the navigation.
- Other sections appear on its left and right.

### Horizontal-track behavior

As the visitor turns the wheel:

1. The wheel visually rotates in the direction of the gesture.
2. The corresponding section moves toward the center of the screen.
3. The selected section is larger and highlighted in ice white.
4. Other options appear in silver gray, smaller, and with reduced opacity.
5. The entire horizontal track moves so the selected option stays centered.
6. Sections that fall behind fade slightly, creating a sense of depth.

Navigation **must not loop or wrap around infinitely**. ABOUT and STACK are the physical endpoints.

### Defined positions — Mandatory rotation direction

**Final mechanical convention, viewing the wheel from the front:**

| Physical steering movement | Direction | Selected section | Angle |
|---|---|---|---:|
| No turn | Centered | HOME | 0° |
| Turn right | Clockwise | PROJECTS | +18° |
| Turn farther right | Clockwise | STACK | +36° |
| Turn left | Counterclockwise | EXPERIENCE | -18° |
| Turn farther left | Counterclockwise | ABOUT | -36° |

**Never reverse this mapping during implementation.** From HOME, the first step to the right is PROJECTS and the second is STACK; the first step to the left is EXPERIENCE and the second is ABOUT.

The red stripe must visibly reflect the physical rotation:

- HOME (0°): stripe points vertically upward.
- PROJECTS (+18°) and STACK (+36°): stripe moves **to the right** of the top position.
- EXPERIENCE (-18°) and ABOUT (-36°): stripe moves **to the left** of the top position.

**Rotation direction and Figma consistency**

The Figma design has been corrected and now matches the approved rotation convention. Clockwise rotation selects PROJECTS and STACK; counterclockwise rotation selects EXPERIENCE and ABOUT. Both the Figma design and this document must be treated as consistent references.

**CSS/browser convention:** In ordinary screen coordinates, `transform: rotate(angleDeg)` rotates clockwise for positive values and counterclockwise for negative values. Preserve this mapping in Pointer Events math, snapping, and synchronization with the horizontal track.

These five angles are the approved implemented configuration. Any tuning requires explicit authorization; **the direction and section order must not change**.

## 6. Landing composition

The initial desktop design uses a **1440 × 900 px** frame.

### Top header

Left:

**AL — AGUSTÍN LÓPEZ**

Subtitle:

SOFTWARE DEVELOPER

Right:

AVAILABLE FOR WORK · 2026

With a small red status indicator.

### Upper-center navigation

Includes:

- A section counter.
- A five-section horizontal track.
- Prominent styling for the active section.
- A red underline beneath the active option.
- Subtle left/right turning cues.

The active section uses refined, larger typography without competing excessively with the steering wheel.

### Center

The wheel is the primary visual focal point.

Maintain enough separation and negative space between the top navigation and the wheel.

### Bottom

The design uses concise interaction cues:

**DRAG TO SELECT**

**CLICK TO ENTER**

It also features small secondary texts and discreet contact links.

Footer tagline:

DESIGNED TO MOVE.

Links: GitHub, LinkedIn, and email.

## 7. Implemented steering mechanics

The following contracts are implemented. Historical verification and outstanding manual checks are separated in [the implementation plan](IMPLEMENTATION_PLAN.md). The calibrated initiation band is 1–45 CSS pixels inside the outer contour, with the confirmation hub excluded.

### Drag interaction

The user must be able to click/press and drag the wheel using:

- Mouse on desktop.
- Touch on mobile and tablets.

The wheel should follow movement naturally while respecting the angular limits.

It must not freely spin 360° or rotate infinitely.

### Snap to valid positions

When the pointer is released:

- Find the closest valid section/angle.
- Smoothly snap the wheel to that valid angle.
- Align the horizontal selection with the resulting section.
- Update the selected-section state.

The motion should decelerate smoothly and feel mechanically weighted, without exaggerated bouncing.

### Selection and confirmation are separate

This is a fundamental UX rule.

**Rotating the wheel only selects a section; it must NEVER automatically navigate.**

A second, explicit action is required to confirm entry.

Implemented confirmation inputs:

- Click the active section label.
- Click the wheel center.
- Press Enter or activate the explicit ENTER control.

An inactive label selects first and confirms only on a later activation. The original idea of a subtle label pulse is optional and unimplemented; adding it requires approval.

### Accessibility

In addition to dragging, support keyboard controls:

- Left Arrow: previous section.
- Right Arrow: next section.
- Enter: confirm.

Provide a reduced-motion alternative for visitors who prefer less animation.

## 8. Cinematic transition into a section

Confirming a section should not result in an abrupt page change.

We previously agreed on a cinematic transition inspired by automotive acceleration.

### Implemented placeholder sequence

1. The user confirms the selected section.
2. A brief feeling of acceleration begins.
3. Abstract speed streaks and motion blur appear.
4. The camera seems to move toward the destination.
5. The wheel gradually shrinks, as if moving away into depth.
6. The selected section's content appears.
7. The wheel becomes a small floating navigation control.

The transition must remain elegant and fluid—not crowded with effects.

The prototype uses approximately **1.8 seconds** for entry and **1.2 seconds** for restoration; reduced motion uses a **150 ms fade**. Aesthetic sign-off and actual-device fluidity remain pending.

### Transition style

We deliberately chose **abstract speed streaks** instead of a literal road, racetrack, or tunnel.

This maintains the minimalist identity and makes implementation more manageable.

## 9. Minimized wheel — Secondary navigation

After entering ABOUT, PROJECTS, STACK, or CONTACT, the primary wheel does not disappear entirely.

It transitions into a **small floating control on the right-hand side** of the screen.

The small wheel is the persistent entry point back to navigation.

### Agreed behavior

- The visitor is viewing a portfolio section.
- A small wheel appears on the side.
- The visitor clicks the wheel.
- The transition reverses.
- The wheel grows and moves back to the center.
- The primary horizontal navigation reappears.
- The visitor can select another section.

Expansion and contraction should feel like parts of one continuous physical experience, not unrelated UI effects.

The implemented control is 72px at desktop right-center and 56px at mobile bottom-right, with safe-area spacing.

## 10. Optional sound

We also discussed subtle mechanical sounds inspired by sports-car controls, such as:

- A soft click when selection snaps into place.
- A mechanical click upon confirmation.
- A gentle sound when the minimized wheel expands.

**Audio must be disabled by default**, with voluntary opt-in.

Audio remains unimplemented and requires separate approval.

## 11. Implemented technology stack and architectural constraints

**Updated decision: use React + Vite + TypeScript, NOT Next.js.** The portfolio is primarily an interactive frontend, and we do not currently need server-side rendering, our own API, or a backend.

Agreed stack:

- **React:** UI components and state.
- **TypeScript:** typing for components, sections, and navigation logic.
- **Vite:** local development and production bundling.
- **Tailwind CSS:** styling, responsive layout, and visual consistency.
- **GSAP:** cinematic transitions and complex animation sequences when helpful.
- **Native Pointer Events:** drag interactions via mouse and touch; avoid unnecessary extra drag libraries.
- **React Router (optional, later):** only if actual routes would be valuable; not needed for the isolated mechanical prototype.

The initial prototype is entirely client-side. For the eventual public portfolio, evaluate indexing, metadata, and prerendering only if necessary; SEO alone is not a reason to introduce Next.js now.

Avoid Three.js unless it is demonstrably necessary.

Separate the wheel's mechanical state and drag calculations from visual presentation and from section navigation.

Implemented mechanical component structure:

- `SteeringWheelNavigator`
- `SteeringWheel`
- `HorizontalSectionTrack`
- `useWheelNavigation`

Centralize section definitions and valid angles in one configuration instead of scattering values across the codebase.

## 12. Implementation status and evidence — 2026-10-26

Implemented locally:

- T1–T8 mechanics and accessibility/mobile baseline: calibrated fixed hub, 1–45 CSS-pixel contour band, capture/cancellation, snapping, synchronized track, keyboard alternatives and explicit confirmation.
- Cinematic entry/return, floating restore control, Escape reversal and reduced motion. HOME remains navigation; ABOUT, EXPERIENCE, PROJECTS and STACK render placeholders only.
- Race Start introduction, explicit START, shared decorative streaks, guarded handoff to unchanged HOME and 15-minute localStorage expiry.
- Runtime artwork: transparent 1254 × 1254 WebP. Both earlier PNGs are preserved; the health audit records pixel-identical alpha and the contour checksum correction without recalibration.

Evidence is checkpoint-specific. [T7/T8](docs/T7_T8_VALIDATION.md) records 127 unit/integration tests, 43 browser passes, two capability skips and 7,244 band assertions. [Cinematic evidence](docs/CINEMATIC_PROTOTYPE.md) records 130 tests and a final targeted 39-case cross-browser rerun after two fixes. [The health audit](docs/APPLICATION_HEALTH_AUDIT.md) later records 70 browser passes and two skips across completed executions. These are historical results, not a fresh run against today's working tree.

The latest available [Race Start report](docs/RACE_START_TIMING.md), dated 2026-10-26, records 149 tests, passing TypeScript/lint/build, and 35 Race Start/cinematic browser passes with one capability skip in Chromium/WebKit. Firefox failed before application load; current Firefox application behavior remains unverified. This documentation cleanup performs no application test rerun.

Physical Android/iOS input, native Safari, NVDA/VoiceOver, actual-device fluidity and final cinematic aesthetic approval remain pending. Real content, contact destinations, full routing, sound, final badge/font/artwork refinement, complete responsive art direction and deployment remain future work requiring approval.

**Approved counters:** ABOUT `01 / 05`, EXPERIENCE `02 / 05`, HOME `03 / 05`, PROJECTS `04 / 05`, STACK `05 / 05`. Figma frames remain static references, not evidence of running behavior.

## 13. Current design exploration — internal sections

**HOME remains unchanged unless explicitly requested.** The approved **Engineering Dossier** visual direction applies only to internal portfolio sections. The specific ABOUT layout remains under design review and has not been implemented; the current ABOUT screen is a placeholder.

Do not infer detailed layout approval from the direction alone. Design discussions do not authorize code changes. Preserve the approved mechanics, existing cinematic transitions, HOME composition and five-section mapping during unrelated work. Implementation of reviewed section designs, real content or routing requires a separate explicit request.

## 14. Mandatory operational restrictions for Codex

Codex must follow the constraints below throughout implementation, including initial setup.

### Project directory and file protection

- **Work only within the selected project's root directory.**
- Create, edit, move, or delete files **only inside that directory** and only when required for approved project work.
- **Do not create, modify, overwrite, move, or delete any file or folder outside the project directory.** Do not change other repositories, personal documents, operating-system configuration, or user configuration.
- Do not run destructive or cleanup commands that may affect paths outside the repository. If an action requires changes outside that boundary, **stop, explain why, and request explicit approval first**.
- Do not install packages globally or modify global Git, Node.js, or other tooling configuration. Manage application dependencies locally.
- Take care with package-manager caches, temporary files, and generated artifacts: configure project-local locations wherever possible. If a tool must write outside the project, ask before proceeding.

### Git and publishing

- **Local Git initialization and commits require an explicitly approved workflow.** Keep existing user changes intact. Do not change branches or create commits during documentation maintenance.
- Create a suitable `.gitignore` for React/Vite/TypeScript (such as excluding `node_modules`, `dist`, secret-bearing `.env` files, package-manager caches, and temporary files).
- **Never execute `git push` without new, explicit authorization from the user.**
- Do not automatically publish, deploy, upload, or synchronize source code to GitHub, GitLab, Bitbucket, Vercel, Netlify, or any other external service.
- Do not create remote repositories or configure `git remote` on your own initiative. Do not run commands that mutate remote repositories.
- **Leave the project fully local** for user review. The user alone decides when to create/connect a remote repository and perform the first push.

### Working style

- Before significant changes, briefly state which **in-project** files will be created or changed.
- Keep modifications limited to the requested task; do not alter other parts of the machine or environment to “fix” the prototype.
- At the end of each phase, report what changed, which checks were run, what remains unresolved, and the **local Git status**. Do not assume publishing authorization.

These rules take priority over generic suggestions to automate project initialization, publication, or deployment.

## 15. Implemented cinematic architecture

The separately approved placeholder prototype extends the original isolated mechanics scope. `useWheelNavigation` remains the single mounted mechanical controller. `useCinematicTransition` owns navigation → entering → section → restoring → navigation independently of page content; destination is captured once and duplicate requests are rejected.

Shared decorative artwork uses identical calibration. The navigator is inert during travel and section viewing; the visual carrier has no mechanical controls. Restore preserves the prior angle/selection, navigation scroll and focus. Boundary measurements and transform/opacity animation avoid per-frame React updates. Resize, hiding and reduced-motion changes settle the requested endpoint; owned animations/listeners/styles are cleaned up.

See [the implementation plan](IMPLEMENTATION_PLAN.md#11-implemented-cinematic-placeholder-prototype) and [cinematic evidence and manual checklist](docs/CINEMATIC_PROTOTYPE.md). Historical preservation claims apply to their checkpoint; subsequent WebP metadata and shared-streak changes are recorded separately, without authorizing changes to mechanical behavior.

## 16. Implemented Race Start introduction

Four columns illuminate at scheduled 0/1/2/3-second steps. START appears with the fourth, fades in over 600ms and then pulses; the fifth waits for explicit activation. START disables immediately, stores a 15-minute expiry and runs an approximately 1.5-second decorative acceleration, including an overlapping 250ms overlay fade. Reduced motion preserves the light cadence and explicit START, removes the pulse and uses a 150ms fade.

HOME and its single controller stay mounted behind an inert gate. Completion or the animation-failure fallback releases HOME at index 2 / 0° and hands focus to its active label, without confirming a section or changing the URL. Valid expiry skips the introduction without extending it; storage errors do not block access.

Race Start reuses only streak configuration/tweens through `speedStreaks.ts`; it does not call cinematic section entry. It is a presentation sequence, not a resource-readiness gate. Missing-artwork and missing-JavaScript recovery remain limitations; no pre-React shell or resource framework was adopted.

[Race Start contract](docs/RACE_START_IMPLEMENTATION_PLAN.md) and [latest timing/validation](docs/RACE_START_TIMING.md) distinguish implementation from incomplete browser/device verification. Timings are local observations, not hosted performance guarantees. Further timing/design changes require approval.
