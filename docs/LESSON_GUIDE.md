# Lesson authoring guide

This is the contract every lesson follows. Read it fully before writing a lesson. **Lesson 1 (`src/lessons/01-what-is-a-pcb/`) is the reference implementation**: match its quality, structure and tone.

## The product in one paragraph

Learn PCB is an interactive course that takes an absolute beginner from "what is a PCB?" to ordering a real board, with step-by-step EasyEDA Pro instructions. The look is a warm cream "engineering notebook": paper backgrounds, graphite ink, copper and orange accents, isometric illustrations, mono uppercase labels, and serif display headings. Every lesson has three parts:

1. **Explore**: a big interactive *Scene* (the stage) with a floating control card and 3–4 **missions** that tick off automatically as the learner plays.
2. **Do it in EasyEDA**: a step list in the right-hand panel with menu paths and shortcuts.
3. **Understand**: an article below the fold, followed by key terms and a 3–4 question quiz.

A single running project, **Blinky** (a 555-timer LED blinker), links everything together. The learner sees the *same* board at different stages: schematic → converted → placed → routed → poured → finished → gerbers → order.

## Files you own

Each lesson lives in `src/lessons/NN-id/` and default-exports a `LessonContent` (see `src/lessons/types.ts`):

```ts
const lesson: LessonContent = {
  Scene,            // interactive stage; fills its container (position:absolute; inset:0 inside)
  goal,             // one sentence shown next to the "TRY IT" tag above the scene
  missions,         // 3–4 hands-on goals: { id, text }
  Article,          // the "Understand" article (600–1100 words)
  build: { intro?, steps: BuildStep[], tip? },   // "Do it in EasyEDA" (3–6 steps)
  quiz,             // 3–4 questions: { q, options, answer, explain }
  terms,            // 5–8 key terms: { term, def }
}
export default lesson
```

You may split the code into extra files inside your lesson folder (e.g. `Scene.tsx`, `lessonNN.css`). Put lesson-specific CSS in a CSS file in your folder and import it. **Prefix class names** with something lesson-specific (e.g. `.l07-…`) to avoid collisions.

### Do NOT modify shared files
These belong to everyone: `src/pcb/*`, `src/components/*`, `src/lessons/types.ts`, `src/lessons/registry.ts`, `src/lessons/mission.tsx`, `src/pages/*`, `src/styles/*`. If you need different behaviour, write a local helper inside your lesson folder (copy and adapt if needed). If a shared component has a genuine bug, mention it in your final report rather than editing it.

## Missions

```tsx
import { useMission } from '../mission'
const mission = useMission()
useEffect(() => { if (explode > 0.85) mission.complete('explode') }, [explode, mission])
```
- 3–4 missions, completable in about 2–4 minutes total, all within the Scene.
- Each one should teach something: "Drag R1 next to the chip so its airwire gets short", not "Click a button".
- Calling `complete` repeatedly is safe. A toast appears automatically.

## Scene design rules

- The scene fills the stage. The stage is roughly **950×600 px on desktop** and **~360×540 px on phones**. **Both must work.** Test on mobile with a 390×844 viewport.
- Put controls in a `<FloatingCard title=… subtitle=…>` (top-left by default; `corner="tr"` etc.). Keep it under about 260 px wide. It's collapsible.
- Optional: a `<SceneToolbar>` pill centred at the bottom for mode buttons, and `<SceneStatus>` for live readouts (bottom-left/right).
- Use the UI kit in `src/components/ui`: `Button, Slider, Toggle, Segmented, Kbd, Keys, Callout, Readout, Chip, Tabs, Legend, Meter, FloatingCard, Panel`.
- Board and EDA visuals use the PCB engine in `src/pcb/` (below). Never hand-draw a board when the engine can render it.
- Animations should be smooth and meaningful (CSS transitions, `requestAnimationFrame`). Respect `prefers-reduced-motion` for anything big.
- Everything must work with **touch** (use pointer events, not mouse events) and with the **keyboard** where reasonable (aria-labels on icon buttons).
- **No network requests and no external assets.** The site ships with a strict CSP. Draw everything as SVG/CSS/canvas/three.js.
- Make it beautiful. Hand-craft SVG illustrations in the house style: isometric, soft shadows, the palette below. Labels use mono uppercase with letter-spacing, as in the reference screenshot.

### Colours
- UI and illustrations: CSS variables from `src/styles/tokens.css` (`--paper`, `--card`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--accent`, `--copper`, `--mask`, `--good`, `--warn`, `--bad`, `--info`…). These adapt to dark mode automatically.
- Board renders use literal colours from `src/pcb/palette.ts` (`EDA`, `MASKS`, `REAL`) so they can be rasterised.
- An EDA canvas is always dark (`theme="eda"`) and mimics EasyEDA: top copper red, bottom copper blue, silkscreen yellow, board outline magenta, multi-layer pads grey.
- A schematic canvas is light (`theme="schematic"`) and mimics EasyEDA: dark red symbols, green wires, blue net labels.

## The PCB engine (`src/pcb/`)

| File | What you get |
|---|---|
| `footprints.ts` | `footprints` / `getFootprint(id)`: R0402, R0603, R0805, R1206, C0805, LED0805, SOIC-8, DIP-8, HDR-1x2/3/4, LED-5MM, R-AXIAL-0.4, SOT-23. Dimensions in mm. |
| `board.ts` | `BoardDoc` model (parts, tracks, vias, pours, texts, netlist); `analyze(doc)` → connectivity (ratsnest airwires, islands, shorts, complete nets); `drc(doc, rules)` → errors; `ratsnestLength`, `ratsnestCrossings`, `partPads`, `allPads`, `courtyardRect`, `beginnerRules`, `newId`. |
| `project.ts` | Blinky: `parts` (with plain-English `role`), `netlist`, `netInfo` (colour + description per net), `placed`, `unplaced`, `tracks`, `vias`, `groundPours`, `silkTexts`, and **`stages.converted() / placed() / routed() / poured() / finished()`**, which return fresh `BoardDoc`s. |
| `render.tsx` | `<BoardView doc mode="eda"\|"real" vis={{top,bottom,silk,outline,ratsnest,pours,bodies,refs}} activeLayer side maskColor finish highlightNet selectedRefs drcErrors netColors onPartPointerDown onPadPointerDown onPadEnter>`; `<FootprintGraphic fp mode showSilk showCourtyard showBody showNumbers highlightPad finish value>`; `<PadGlyph>`, `<PartBodyTop>`, `<PourFill>`, `<DrcMarkers>`, `FootprintSilk`, `RefLabel`, `SilkTextEl`, `partTransform`. Everything is in **mm** inside an SVG. |
| `PcbCanvas.tsx` | `<PcbCanvas fit={{x,y,w,h}} theme="eda"\|"paper"\|"schematic"\|"none" grid={1} interactive zoomControls onPointerDown/Move/Up={(e, worldMm) => …} cursor overlay>`: a pan/zoom SVG viewport in world units. `ref.toWorld(clientX, clientY)`. With `interactive`, empty-space drag pans (when you pass no `onPointerDown`), Alt-drag and right/middle-drag always pan, the wheel zooms, and pinch zooms. |
| `schematic.tsx` | Symbols (`R`, `C`, `LED`, `NE555`, `HDR2`), `SchDoc` model, `blinkySchematic()`, `SCH_BOUNDS`, `schNets(doc)`, `checkAgainst(doc, netlist)`, `symPins(inst)`. |
| `SchematicView.tsx` | `<SchematicView doc highlightNet highlightRefs dimOthers showPinNumbers showPinNames onSymbolPointerDown onPinPointerDown onPinEnter hintPins>`, `SymbolGraphic`, `FlagGraphic`, `NetLabelGraphic`, `SCH` colours. |
| `Board3D.tsx` | `<Board3D doc maskColor finish showParts explode autoRotate blink view>`: a full 3D board (three.js). Lazy-load it with `React.lazy` because it's heavy. Also `Part3D`, `roundedRectShape`. |
| `svgTexture.ts` | `useSvgTexture(svgEl, key)`: rasterise an SVG into a three.js texture. |
| `geom.ts` | `Vec`, `dist`, `rotate`, `snap`, `route45`, `snap45`, `pointSegDist`, `segSegDist`, `shapeDist`. |

Coordinates: board space is mm, origin at the board's top-left corner, +y down. The Blinky board is 30 × 26 mm.

Article helpers in `src/components/content.tsx`: `Figure` (captioned frame), `Formula`, `Compare` (do/don't), `Steps` (numbered list), `Menu` (inline EasyEDA menu path), `Specs` (spec cards), `EdaWindow` (a mock EasyEDA Pro window frame), `SceneToolbar`, `SceneStatus`. Prose styles live in `src/styles/prose.css`: use `<p className="lead">` for the opener, then `<h2>` sections, `<ul>`, `<table>`, `<Callout kind="tip|warn|danger|easyeda|fab|info">`.

### Gotcha: uppercase labels
Mono uppercase labels (`.eyebrow`, `.field__label`, `.readout__label`, `Specs` keys) use `text-transform: uppercase`, which turns units into nonsense ("mW" becomes "MW", "µF" becomes "MF"). Put units in the value, not the label, or wrap them in `<span style={{ textTransform: 'none' }}>`.

## Writing style

- Audience: a smart beginner with no electronics background. Explain every term the first time it appears. Short paragraphs. Concrete analogies (water pipes, roads and bridges…). Encouraging, never condescending.
- **British English** spelling (colour, centre, aluminium) to match the existing lessons.
- Use real numbers and real part names from Blinky so the course feels coherent.
- Avoid "simply"/"just"/"obviously". No emojis.
- Bold the key idea of each section once. Don't over-format.

## EasyEDA accuracy (important)

- **Only state EasyEDA facts that appear in `docs/easyeda-reference.md`.** Read it. If something is tagged `[unverified]` or `CONFLICT`, avoid it, or give the menu path and say "check Settings › Shortcuts".
- Lead with **menu paths** (`menu: ['Design', 'Check DRC']`); keys are secondary (`keys: ['Shift+B']`). The build panel footer already says shortcuts can vary.
- Target **EasyEDA Pro**. Mention Standard Edition differences only when they really matter.
- Fab numbers: teach the **beginner defaults** from the reference (0.25 mm signal track, 0.5 mm power, 0.2 mm clearance, 0.3/0.6 mm via, 1.6 mm FR-4, 1 oz copper, LeadFree HASL). Remind learners that fab limits change and they should check their manufacturer's capabilities page.

## Quality bar & testing

1. `npx tsc --noEmit -p .` must show **no errors in your files**. Errors in other lessons' folders may be from parallel work; ignore those.
2. The dev server runs at `http://127.0.0.1:5173`. Screenshot your lesson and look at it:
   ```bash
   node scripts/shot.mjs /learn/<lesson-id> /tmp/claude-0/-home-user-pcb-learning/82c6152a-39d0-53ec-a915-dc1d1608d611/scratchpad/<name>.png 1440 900 --wait=3000
   node scripts/shot.mjs /learn/<lesson-id> <out>.png 390 844 --wait=3000          # phone
   node scripts/shot.mjs /learn/<lesson-id> <out>.png 1440 900 --full --wait=3000   # whole page incl. article & quiz
   node scripts/shot.mjs /learn/<lesson-id> <out>.png 1440 900 --dark --wait=3000   # dark mode
   ```
   Then open the PNG with the Read tool. The script prints console errors, and there must be none from your code. Iterate until it looks polished at both sizes and in both themes.
3. To test interactions, write a small Playwright script in `scripts/dev/` (see `scripts/dev/eval.mjs` and `scripts/shot.mjs` for the launch options: `executablePath: '/opt/pw-browsers/chromium'`). Drive your scene (drag, click), check that missions complete, and take screenshots mid-interaction.
4. Do **not** run `npm install` or add dependencies. Do not start another dev server. Do not commit. The lead will integrate.
