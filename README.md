# Learn PCB

An interactive, beginner-friendly course that takes you from "what is a PCB?" to ordering your first real circuit board, with step-by-step **EasyEDA Pro** guidance in every lesson.

> Hardware looks scary until you break it into small steps.

## What's inside

- **16 lessons in 4 chapters**: Foundations → Schematic → Layout → Fabrication. Each lesson has:
  - **Explore**: a hands-on interactive scene (3D layer stacks, live circuits, a schematic editor, a placement puzzle, a router, copper pours, DRC bug hunts, a Gerber viewer, an order simulator) with missions that tick off as you play.
  - **Do it in EasyEDA**: the exact menu paths and shortcuts for that step.
  - **Understand**: a short illustrated article, key terms and a quiz.
- **One running project, "Blinky"**: a 555-timer LED blinker that you follow from schematic to a finished, DRC-clean, 3D-previewed board.
- **Capstone sandbox** (`/sandbox`): a mini EasyEDA-style PCB editor in the browser. Place, route on two layers, add vias, pour ground, run DRC and view your board in 3D.
- **EasyEDA cheat sheet** (`/shortcuts`): an interactive keyboard map plus a searchable, printable reference.
- **Glossary** (`/glossary`): every term from the course.

## Principles

- **Accuracy first.** EasyEDA and fab facts come from a fact-checked reference (`docs/easyeda-reference.md`). Lessons lead with menu paths because shortcuts depend on EasyEDA's shortcut theme.
- **Private by design.** No accounts, no analytics, no cookies, no third-party requests. Progress is stored only in the learner's browser (`localStorage`). A strict Content-Security-Policy is set in `vercel.json`.
- **Accessible and responsive.** It works on phones, with touch, the keyboard, light and dark themes, and `prefers-reduced-motion`.

## Tech

React 19 · TypeScript · Vite · three.js (react-three-fiber) · hand-written SVG. No backend.

A small PCB engine in `src/pcb/` powers every visual: a footprint library, a board model, connectivity and ratsnest, a design-rule checker, EDA and photo-real SVG renderers, a pan/zoom canvas, a schematic model and renderer, and a 3D board viewer.

```
src/
  pcb/          PCB engine (geometry, footprints, board model, DRC, renderers, 3D, schematic)
  lessons/      one folder per lesson + registry, types, missions
  sandbox/      capstone editor
  pages/        home, lesson page, sandbox, shortcuts, glossary
  components/   UI kit, shell, article helpers, thumbnails
docs/
  LESSON_GUIDE.md        authoring contract for lessons
  easyeda-reference.md   fact-checked EasyEDA / JLCPCB reference
```

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
```

Deploys as a static site (Vercel config with SPA rewrites and security headers in `vercel.json`).

## Disclaimer

Not affiliated with EasyEDA, LCSC or JLCPCB. Manufacturing capabilities and prices change, so always check your manufacturer's current capabilities page before ordering.
