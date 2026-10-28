# Project instructions — GT3 interactive portfolio

## Source of truth

- Read `AGENTS.md`, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_PLAN.md` completely before project-specific recommendations or changes.
- Follow the approved visual direction and the required angle/section mapping in `PROJECT_CONTEXT.md`.
- If Figma visually contradicts a defined mechanical rule, the written mechanical rule takes precedence.

## Safety and working directory

- Operate only inside the **currently opened project root**. Do not create, modify, move, delete, or overwrite files outside it.
- Do not change machine/user configuration, global Node or Git settings, other projects, or other repositories.
- Never install global packages. Prefer project-local dependencies and project-local package-manager caches and temporary files. Ask for approval before any command requiring writes outside the project root.
- Avoid destructive commands. Inspect intended effects and ask first whenever a command's file scope is uncertain.
- Do not use symlinks or path traversal to access files outside the project directory.

## Local Git only

- You may run `git init` locally and create local commits when explicitly part of the approved workflow.
- Keep `.gitignore` appropriate for Vite, React, TypeScript, `.env` secrets, build output, and local caches.
- Never run `git push`, add/change a remote, create a hosted repository, publish, deploy, or synchronize source code with an external service without the user's **new, explicit approval**.
- Keep work local unless the user gives new, explicit approval for remote writes or publishing. Do not commit, initialize Git or change branches unless explicitly authorized.

## Implementation scope

- Stack: React, Vite, TypeScript, Tailwind CSS, native Pointer Events; GSAP only when useful.
- Implemented baseline: steering mechanics, cinematic placeholder navigation and Race Start. Current design exploration concerns internal portfolio sections.
- HOME must remain unchanged unless explicitly requested. Preserve the existing wheel mechanics, calibrated drag geometry, artwork and cinematic transitions during unrelated tasks.
- Engineering Dossier is the approved visual direction for internal sections only. The specific ABOUT layout remains under design review and has not been implemented.
- Design discussions and documentation do not authorize implementation. Significant changes, full portfolio pages, routing, sound and deployment require a separate explicit request.
- Keep steering mechanics independent of presentation and keep section/angle mapping centralized.
- Required mapping: ABOUT = -36°, EXPERIENCE = -18°, HOME = 0°, PROJECTS = +18°, STACK = +36°.
- Required mapping: ABOUT = -36°, EXPERIENCE = -18°, HOME = 0°, PROJECTS = +18°, STACK = +36°.
- Positive angles turn the wheel clockwise/right; negative angles turn counterclockwise/left. Selection never automatically navigates.

## Task workflow

- Preserve unrelated files and all pre-existing modified/untracked work; never reset, revert or discard user changes. Delete only specifically approved files, after preserving unique information and repairing references.
- Do not start, stop, restart or reuse the user's development server without explicit authorization. Isolated production previews also require authorization for the task; documentation work needs no server.
- Before major changes, briefly identify the files to be created or modified, all within this project.
- Make targeted changes; validate the affected behavior and report actual checks without claiming unrun tests.
- Conclude each phase with files changed, validation results, remaining issues, and local Git status.
