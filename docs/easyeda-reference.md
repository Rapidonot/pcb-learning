# EasyEDA Pro + JLCPCB fact-checked reference

Reference for lesson authors. Lessons should not state a shortcut, menu path or number that isn't backed by this file.

Research date: 2026-10-22. Target: **EasyEDA Pro** (Standard Edition noted only where it differs).

## How to read the tags

- `[verified: <url>]`: the official page at that URL states the fact.
- `[unverified]`: I couldn't confirm it from an official source. Check it in the app before teaching it.
- `CONFLICT:`: official pages disagree with each other. The lesson should give the menu path first and treat the shortcut as secondary.

**Method caveat:** the research sandbox blocked direct page fetches, including prodocs.easyeda.com, docs.easyeda.com and jlcpcb.com. Every `[verified]` item was confirmed from search-engine excerpts of the cited official page, not from reading the page in full. Before publishing, have someone open each cited URL once to confirm it, especially the numeric limits in section 5.

### Ground rules for lessons (important)

1. **EasyEDA Pro shortcuts depend on the shortcut theme.** Since v1.9 there are two shortcut themes, "Professional Edition" and "Standard Edition", and "the shortcuts for many functions have been modified" [verified: https://prodocs.easyeda.com/en/release-note/v1.9.x/]. Example: the wire tool is `Alt+W` in the Pro theme and `W` in the Std theme [verified: https://prodocs.easyeda.com/en/quick-start.html]. The hotkey reference page lists plain `W` [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/]. There is also an Altium Designer shortcut theme (v1.8+) [verified: https://prodocs.easyeda.com/en/release-note/v1.8.x/].
2. **All shortcuts can be remapped** under **Top Menu > Settings > Shortcuts** [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/]. Teach the **menu path as the primary instruction** and the shortcut as "default, may vary". Tell learners where to check.
3. Zoom In (`A`) and Zoom Out (`Z`) have had **no default binding since v1.8**. Use the mouse wheel [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/].

---

## 1. EasyEDA Pro overview

### Editions
- **Standard (Std)** is in maintenance mode: "will no longer add new features". EasyEDA recommends migrating to Pro and supports batch migration of Std libraries and projects [verified: https://easyeda.com/editor].
- Pro and Std are each available as a **web editor** (browser, no install) and a **desktop client** for Windows, Linux and macOS [verified: https://easyeda.com/page/download]. The Pro client supports only 64-bit systems [verified: https://prodocs.easyeda.com/en/faq/client/].
- Pro desktop client modes [verified: https://prodocs.easyeda.com/en/faq/client/]:
  - **Full online**: login required, cloud storage, team collaboration.
  - **Half-offline** (recommended): no login, local projects and libraries, online system library still available.
  - **Full offline**: no cloud system library.
- Std vs Pro feature comparison page: https://prodocs.easyeda.com/en/introduction/std-vs-pro/ (I couldn't read the table contents) [unverified].

### Create a project
- **File > New > Project**, or the "New Project" icon in the Quick Start window in the middle of the editor. A dialog sets owner, name, link and description [verified: https://prodocs.easyeda.com/en/quick-start.html].
- A new Pro project automatically contains **a board, a schematic and a PCB** [verified: https://prodocs.easyeda.com/en/pcb/file-new-pcb/].
- Add pages separately: **File > New > Schematic** or **File > New > PCB** [verified: https://prodocs.easyeda.com/en/schematic/file-new-schematic-page/, https://prodocs.easyeda.com/en/pcb/file-new-pcb/].
- The schematic and the PCB must belong to the **same board** for conversion and updates to work [verified: https://prodocs.easyeda.com/en/schematic/design-update-convert-schematic-to-pcb/].

### Main UI regions
- **Top menu** (File, Edit, View, Place, Design, Export/Order, Settings…) and **top toolbar** [verified (names only): https://prodocs.easyeda.com/en/introduction/introduction-ui/index.html]. I couldn't confirm the exact toolbar contents [unverified].
- **Left panel**: the project list ("all the projects of the current user, including joined team projects"), workspace switching, and the **Common (Commonly-used) Library** tab, which holds built-in common libraries and lets you add custom ones via the gear icon [verified: https://prodocs.easyeda.com/en/schematic/side-panel-left-commonly-library/]. The exact tab labels ("All Projects", "Libraries") [unverified].
- **Bottom panel**: the **Library** panel (tabs: System, Recent, Personal, Favorite). Open it by clicking it at the bottom left, through View, or with shortcut **`S`** [verified: https://prodocs.easyeda.com/en/schematic/side-panel-bottom-library/]. DRC results also appear in the bottom panel [verified: https://prodocs.easyeda.com/en/quick-start.html].
- **Right panel**: **Property** (also Filter and Status). Edits the selected object, and you can batch-select objects and edit them together [verified: https://prodocs.easyeda.com/en/schematic/side-panel-right-property/].
- **PCB right panel – Layers**: eye icons toggle layer visibility, and the panel lists the layer-switch keys (see section 4) [verified: https://prodocs.easyeda.com/en/pcb/side-right-panel-layer/]. **Layer Manager** (Tools) sets the layer stack [verified: https://prodocs.easyeda.com/en/pcb/tools-layer-manager/].

### Switching schematic ↔ PCB
- Open either document by double-clicking it in the left project tree. Each opens as an editor tab [unverified for exact wording].
- **Cross Probe / cross-select: `Shift+X`** jumps to the matching component, pad or net in the other document [verified: https://prodocs.easyeda.com/en/pcb/design-cross-probe/].
- **Place Transfer: `Ctrl+Shift+X`** (different command): selected schematic parts get highlighted in the PCB so you can place them [verified: https://prodocs.easyeda.com/en/schematic/design-placement-transfer/].

---

## 2. Schematic editor (Pro)

| Action | How | Tag |
|---|---|---|
| Place part (device dialog) | **`Shift+F`** or Place > Device | [verified: https://prodocs.easyeda.com/en/schematic/place-device/] |
| Open the library panel | **`S`** | [verified: https://prodocs.easyeda.com/en/schematic/side-panel-bottom-library/] |
| Wire | **`W`** (hotkey page / Std theme) or **`Alt+W`** (Pro theme per Quick Start). CONFLICT: check Settings > Shortcuts | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] [verified: https://prodocs.easyeda.com/en/quick-start.html] |
| Name a wire while drawing | `Tab` | [verified: https://prodocs.easyeda.com/en/quick-start.html] |
| Net label | **`N`** | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Net flag (VCC/GND power and ground symbols) | **Place > Net Flag**. Built-in flags are Power, Ground, Analog Ground and Protect Ground. No default shortcut found | [verified: https://prodocs.easyeda.com/en/schematic/place-net-flag/] |
| Net port | **Place > Net Port**. No shortcut found | [verified (menu): https://prodocs.easyeda.com/en/schematic/place-net-flag/] |
| Bus | `Alt+B` | [verified: https://prodocs.easyeda.com/en/schematic/place-bus/] |
| No-connect flag | Place > No Connect (pin endpoints only) | [verified: https://prodocs.easyeda.com/en/schematic/place-no-connect/] |
| Rotate | **`Space`** ("Rotate Left") | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Mirror | **`X`** (left/right), **`Y`** (up/down) | [verified: https://prodocs.easyeda.com/en/faq/schematic/] |
| Delete | `Delete` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Move | Drag. **`M`** = "move according to the center" | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Save all | `Ctrl+S` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Find / replace | `Ctrl+F` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Fit all | `K` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Annotate designators | **Design > Annotate Designator** (keep existing / re-annotate all / clear to "?") | [verified: https://prodocs.easyeda.com/en/pcb/design-annotate-designator/] |
| Schematic check (EasyEDA calls it DRC, not ERC) | **Design > Check DRC**. Results appear in the bottom-panel DRC tab. Design > Check DRC (Custom) picks which checks run | [verified: https://prodocs.easyeda.com/en/quick-start.html] [verified: https://prodocs.easyeda.com/en/pcb/design-check-drc-custom/] |
| Set a part's value or attributes | Select the part, then edit it in the right **Property** panel (name, designator, footprint, supplier/supplier number, manufacturer number). Tick name/value to show it on the canvas | [verified: https://prodocs.easyeda.com/en/schematic/side-panel-right-property/] [verified: https://prodocs.easyeda.com/en/schematic/place-device/] |

**Pro concept difference:** in Pro, a net label is not a separate object. Placing it sets the **name attribute of the wire**, and the wire name is the net name [verified: https://prodocs.easyeda.com/en/faq/schematic/]. A net connected to only one pin produces a "single-pin net" error [verified: https://prodocs.easyeda.com/en/faq/schematic/].

**Std Edition differences:** `Space` or `R` rotates, `X`/`Y` flip, `W` wire, `N` net label, **`Ctrl+G` = GND flag, `Ctrl+Q` = VCC flag** [verified: https://docs.easyeda.com/en/Introduction/Shortcut-Keys/]. The Pro equivalents of Ctrl+G/Ctrl+Q are [unverified].

---

## 3. Converting schematic to PCB

- **Menu (Pro):** in the schematic, **Design > Update/Convert Schematic to PCB**. A **"Confirm Import Information"** dialog lists the changes, all ticked by default, then you apply them [verified: https://prodocs.easyeda.com/en/schematic/design-update-convert-schematic-to-pcb/].
- **From the PCB side:** **Design > Import Changes from Schematic** [verified: https://prodocs.easyeda.com/en/pcb/design-import-changes-from-schematic/].
- **Shortcut:** none found in official docs [unverified]. Don't teach one.
- Run **Design > Check DRC** on the schematic before converting [verified: https://prodocs.easyeda.com/en/quick-start.html]. Conversion aborts with an error dialog if symbol/footprint data is abnormal [verified: https://prodocs.easyeda.com/en/schematic/design-update-convert-schematic-to-pcb/].
- Later schematic edits are pushed with the same command (Update PCB). It keeps the existing layout, but nets on already-routed traces may need fixing by hand [verified: https://prodocs.easyeda.com/en/schematic/design-update-convert-schematic-to-pcb/]. Warning in docs: some import changes can't be undone [verified: same URL].
- **Ratsnest:** thin **blue "flying lines"** (ratlines) between pads on the same net that still need routing [verified: https://prodocs.easyeda.com/en/schematic/design-update-convert-schematic-to-pcb/index.html]. View > Ratline toggles them [verified: https://prodocs.easyeda.com/en/schematic/design-placement-transfer/].
- **Board outline (Pro):**
  - Draw it with **Place > Board Outline** (rectangle, circle or polygon) [verified: https://prodocs.easyeda.com/en/pcb/place-board-outline/].
  - Alternatively draw lines and move them to the Board Outline layer [verified: same URL].
  - Only one outline per board. Extra closed outlines become slot areas [verified: same URL].
  - The outline must be closed with no overlaps, or 3D preview fails [verified: https://prodocs.easyeda.com/en/faq/pcb/].
  - Auto Layout generates a rectangular outline if none exists [verified: https://prodocs.easyeda.com/en/pcb/layout-auto-layout/].
  - Whether plain conversion in Pro auto-creates an outline [unverified].
- **Std Edition:** **Design > Convert to PCB**, and Std "will try to create a board outline for you" [verified: https://docs.easyeda.com/en/Schematic/Convert-to-PCB/] [verified: https://docs.easyeda.com/en/PCB/Board-Outline/].

---

## 4. PCB editor (Pro)

| Action | How | Tag |
|---|---|---|
| Route track | **`W`** (hotkey page), **`Alt+W`** in Pro theme per Quick Start. CONFLICT. Double-clicking a pad also starts routing | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] [verified: https://prodocs.easyeda.com/en/quick-start.html] [verified: https://prodocs.easyeda.com/en/pcb/route-single-routing/] |
| Switch active layer | **`T`** = top, **`B`** = bottom, `1`–`4` = inner layers 1–4 | [verified: https://prodocs.easyeda.com/en/pcb/side-right-panel-layer/] |
| Next / previous copper layer | `Num*` / `Shift+Num*` (numeric-keypad asterisk) | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Change layer while routing (auto via) | Use the layer-switch key mid-route and a via is added automatically. Settings option: "Auto Change Layer While Routing Vias". CONFLICT: the PCB FAQ says **`Alt+T` / `Alt+B`**, while the hotkey table gives `T` / `B` | [verified: https://prodocs.easyeda.com/en/pcb/place-via/] [verified: https://prodocs.easyeda.com/en/pcb/settings-pcb/] [verified: https://prodocs.easyeda.com/en/faq/pcb/] |
| Place via | **`V`**. `Shift+V` toggles common via sizes while routing or placing | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Change track width while routing | **`Shift+W`** cycles common widths. Right-click menu, or command box `C` then `W <width>`. Note that the hotkey page also lists Shift+W as "close current tab" | [verified: https://prodocs.easyeda.com/en/pcb/route-routing-width/] [verified: https://prodocs.easyeda.com/en/pcb/tools-command/] |
| Routing corner (45°, 90°, arc 45°, arc 90°, free arc/line) | **`L`** while routing, Route > Routing Corner, toolbar, or right-click | [verified: https://prodocs.easyeda.com/en/pcb/route-routing-corner/] |
| Rotate | `Space` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Mirror object | `X` (left/right), `Y` (up/down) | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| Flip part to the other side (top↔bottom) | Set the layer in the Property panel. No dedicated shortcut found | [unverified] |
| Flip the board view (look from the bottom) | **`F`** (Edit/View > Flip Board). CONFLICT: the 2D Preview page says Shift+F | [verified: https://prodocs.easyeda.com/en/pcb/view-flip-board/] |
| Toggle layer visibility | Eye icons in the right Layers panel. `Shift+S` highlights the current layer only | [verified: https://prodocs.easyeda.com/en/pcb/side-right-panel-layer/] |
| Measure distance | **`Alt+M`** (default since v1.2.6). CONFLICT: the Measure page mentions Ctrl+M | [verified: https://prodocs.easyeda.com/en/pcb/tools-measure-distance/] |
| Copper area / pour | **Place > Copper Region** (rectangle/polygon). No default shortcut in Pro. The net is taken from touching copper and can be set (e.g. **GND**) in the Property panel. Copper with no net is removed as an island unless "Keep Islands" is on | [verified: https://prodocs.easyeda.com/en/pcb/place-copper-region/] |
| Rebuild all copper | **`Shift+B`** | [verified: https://prodocs.easyeda.com/en/pcb/place-copper-region/] |
| Show/hide copper areas | `Shift+M` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |
| DRC | **Design > Check DRC**. Real-time DRC can be enabled | [verified: https://prodocs.easyeda.com/en/pcb/design-check-drc/] |
| Design rules | **Design > Design Rules** (track width min/default/max, clearance matrix, via size min/default/max…) | [verified: https://prodocs.easyeda.com/en/pcb/design-design-rule/] |
| 3D view | **View > 3D Preview** or the toolbar icon. No default shortcut found | [verified: https://prodocs.easyeda.com/en/pcb/view-preview-3d/] |
| 2D (photo) preview | **View > 2D Preview** or the toolbar icon (choose top/bottom side, board color, silkscreen) | [verified: https://prodocs.easyeda.com/en/pcb/view-preview-2d/] |
| Units mm ↔ mil | **`Q`**, or View menu | [verified: https://prodocs.easyeda.com/en/quick-start.html] |
| Grid | View > Grid or right-click > Grid. Presets under Settings > PCB/Footprint > Common Grid Sizes | [verified: https://prodocs.easyeda.com/en/pcb/view-grid-size/] |
| Command box | `C` (PCB/footprint editor only). E.g. `L 2` switches to the bottom layer | [verified: https://prodocs.easyeda.com/en/pcb/tools-command/] |
| Highlight net | `H` | [verified: https://prodocs.easyeda.com/en/introduction/hotkeys/] |

Copper auto-rebuild setting: **Settings > PCB/Footprint > General > Rebuild Copper Region automatically** [verified: https://prodocs.easyeda.com/en/release-note/v3.0.x/].

**Std Edition differences:** `W` track, `V` via, **`E` copper area**, `T` changes layer [verified: https://docs.easyeda.com/en/Introduction/Shortcut-Keys/]. Std's `Shift+B` rebuild and `Alt+3`-style 3D view shortcuts [unverified].

---

## 5. Design rules

### EasyEDA defaults
- Rules are named sets. The rule called **"Default"** applies to every net that has no special rule [verified: https://prodocs.easyeda.com/en/pcb/design-design-rule/].
- The default track width is used for new routes. A route started from an existing track inherits that track's width [verified: same URL].
- Pro V3 lets you set PCB rules in the schematic, and they carry over on conversion [verified: https://prodocs.easyeda.com/en/faq/pcb/].
- **Numeric default values** (commonly quoted as 10 mil / 0.254 mm track, 6 mil / 0.152 mm clearance, 24 mil via OD / 12 mil drill) [unverified]. Have learners read them from Design > Design Rules instead.

### JLCPCB minimums (standard FR-4, 2-layer, 1 oz)
Source for all rows: https://jlcpcb.com/capabilities/pcb-capabilities unless noted. JLCPCB's own blog posts sometimes quote older or tighter numbers, so treat the capabilities page as the authority.

| Item | JLCPCB value | Tag |
|---|---|---|
| Min trace width / spacing | 0.10 / 0.10 mm (4/4 mil) for 1–2 layers, 3.5/3.5 mil for multilayer. CONFLICT: a JLCPCB blog says 5/5 mil for 2-layer | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] |
| Min via hole / via diameter | 0.15 / 0.25 mm. Holes of 0.1–0.15 mm, or 0.2–0.25 mm with via diameter under 0.45 mm, **cost extra**. The JLCPCB blog recommends vias larger than 0.3 mm. CONFLICT with older page versions (0.2 mm; 2-layer 0.3/0.4 mm) | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] [verified: https://jlcpcb.com/blog/pcb-via-design-best-practices] |
| Annular ring | 0.25 mm recommended, 0.18 mm absolute minimum (2-layer, 1 oz). CONFLICT: a JLCPCB Q&A quotes 0.13 mm | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] |
| Min drill (PTH) | 0.1 mm possible but costly. JLCPCB recommends PTH ≥ 0.5 mm for component holes. CONFLICT: a blog says 0.3 mm for 1–2 layer | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] |
| Copper to board edge (routed) | ≥ 0.2 mm. 0.3–0.5 mm recommended | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] [verified: https://jlcpcb.com/blog/pcb-board-outline] |
| Silkscreen line width | ≥ 0.15 mm (thinner text may be widened to 0.15 mm) | [verified: https://jlcpcb.com/help/article/instructions-for-ordering] |
| Silkscreen text height | ≥ 1.0 mm. Preferred width:height ratio 1:6 | [verified: https://jlcpcb.com/help/article/instructions-for-ordering] |
| Solder-mask bridge | ≥ 0.2 mm on 1–2 layer, 0.1 mm on multilayer | [verified: https://jlcpcb.com/help/article/instructions-for-ordering] |
| Plated slot | width ≥ 0.5 mm, length ≥ 2× width | [verified: https://jlcpcb.com/help/article/instructions-for-ordering] |
| Board thickness (FR-4) | 0.4, 0.6, 0.8, 1.0, 1.2, **1.6** (standard), 2.0 mm. 0.4 mm is ENIG only. 0.6 mm 2-layer can't use leaded HASL | [verified: https://jlcpcb.com/help/article/jlcpcb-base-material] [verified: https://jlcpcb.com/resources/pcb-thickness] |

### Recommended beginner defaults (what lessons should teach)
These are conservative values well inside JLCPCB's limits. They are teaching recommendations, not fab limits.

| Rule | Value |
|---|---|
| Signal track | 0.25 mm (≈10 mil) |
| Power track | 0.5 mm (≈20 mil) or wider. Check with the IPC-2221 formula (section 8) |
| Clearance (track/pad/via) | 0.2 mm (≈8 mil) |
| Via | 0.3 mm drill / 0.6 mm diameter (0.15 mm annular ring, above the 0.15/0.25 mm minimum and out of the extra-cost zone) |
| Copper to board edge | 0.3 mm or more (0.5 mm is safer) |
| Silkscreen | 0.15 mm line, 1.0 mm text height or more |
| Through-hole component drill | ≥ 0.5 mm |

---

## 6. Output & ordering

### Gerbers (Pro)
- **Export > PCB Fabrication File (Gerber)** from the open PCB [verified: https://prodocs.easyeda.com/en/quick-start.html] [verified: https://jlcpcb.com/help/article/how-to-design-multi-color-silkscreen-using-easyeda]. Doc pages word it slightly differently ("Generate PCB Fabrication File").
- Std Edition: **Fabrication > PCB Fabrication File (Gerber)** [verified: https://jlcpcb.com/help/article/how-to-generate-gerber-files-from-easyeda].
- Output is a zip of RS-274X Gerbers plus Excellon drill files. JLCPCB no longer supports RS-274-D [verified: https://jlcpcb.com/help/article/gerber-files-preparation].

**Files in the zip** (EasyEDA names them like `Gerber_TopLayer.GTL`) [verified: https://jlcpcb.com/help/article/how-to-generate-gerber-files-from-easyeda] [verified: https://jlcpcb.com/help/article/suggested-naming-patterns]:

| Ext | Layer |
|---|---|
| GTL / GBL | Top / bottom copper |
| GTS / GBS | Top / bottom solder mask |
| GTO / GBO | Top / bottom silkscreen (overlay) |
| GTP / GBP | Top / bottom paste (needed for stencil/SMT) |
| GKO (or GML/GM) | Board outline. Required |
| `Drill_PTH_Through.DRL`, `Drill_NPTH_Through.DRL` | Plated / non-plated drill (Excellon). Required |

### BOM and Pick & Place (CPL)
- **BOM:** **Export > Bill of Materials (BOM)**, from the schematic or the PCB. XLSX or CSV [verified: https://prodocs.easyeda.com/en/pcb/export-bill-of-materials-bom/].
- **Pick & Place:** **Export > Pick and Place File**, **PCB only**. XLSX/CSV in mm or mil. Columns: designator, footprint, center coordinates, layer, rotation… For JLC, don't tick bottom-side mirror [verified: https://prodocs.easyeda.com/en/pcb/export-pick-and-place-file/].
- **Order Parts** (Export menu) sends the BOM to LCSC [verified: https://prodocs.easyeda.com/en/schematic/export-order-parts/].

### One-click order at JLCPCB
1. With the PCB open, choose **Order > PCB Order** (some pages say Export > PCB Order) [verified: https://prodocs.easyeda.com/en/pcb/order-order-pcb/] [verified: https://prodocs.easyeda.com/en/quick-start.html].
2. EasyEDA runs checks (ratlines, board outline, DRC), uploads the Gerbers, then **BOM and CPL**, to JLCPCB [verified: https://prodocs.easyeda.com/en/faq/fabrication/] [verified: https://prodocs.easyeda.com/en/faq/update-record/].
3. Click **Confirm** to open the JLCPCB order page [verified: https://prodocs.easyeda.com/en/pcb/order-order-pcb/].
4. The upload does **not** save the files locally. Export them yourself if you want a backup [verified: https://prodocs.easyeda.com/en/faq/fabrication/].
- Optional: **Design > DFM Check** opens the JLCPCB DFM tool [verified: https://prodocs.easyeda.com/en/faq/update-record/].

### JLCPCB order form: beginner defaults
Order flow: upload the Gerber zip. JLCPCB auto-detects size and layers. Pick options, check the Gerber viewer, save to cart, check out [verified: https://jlcpcb.com/help/article/instructions-for-ordering].

| Field | Beginner default / options | Tag |
|---|---|---|
| Base material | FR-4 | [verified: https://jlcpcb.com/help/article/jlcpcb-base-material] |
| Layers | 2 (auto-detected) | [verified: https://jlcpcb.com/help/article/instructions-for-ordering] |
| Dimensions | auto-detected from the outline | [verified: same] |
| Quantity | **5** is the smallest tier. Only listed quantities can be chosen (no 3 or 8) | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] [verified: https://jlcpcb.com/quote] |
| Thickness | **1.6 mm** | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] |
| Solder mask color | Green (default), Purple, Red, Yellow, Blue, White, Black | [verified: https://jlcpcb.com/pcb-fabrication/fr4-pcb] |
| Silkscreen | White on green (default) | [verified: https://jlcpcb.com/capabilities/pcb-capabilities] |
| Surface finish | HASL (with lead), **LeadFree HASL** (recommended standard, RoHS), ENIG (RoHS, flat, for fine pitch/BGA) | [verified: https://jlcpcb.com/help/article/jlcpcb-surface-finish] |
| Outer copper weight | **1 oz** (2 oz available) | [verified: https://jlcpcb.com/help/article/jlcpcb-copper-weight] |
| Remove order number | JLCPCB prints an order number on the silkscreen by default. Options: "Specify a location" (put the placeholder text `JLCJLCJLCJLC` on silkscreen) or "Remove" (small fee). Exact option labels [unverified]. Placeholder text [unverified] | [verified (options): https://jlcpcb.com/help/answers/detail/792-Order-number-printed-on-pcb] |
| Gold fingers | No (default). Gold plating only with ENIG (with HASL the edge is HASL). Bevel 30° (recommended) or 45°. Board ≥ 50 mm | [verified: https://jlcpcb.com/help/article/jlcpcb-gold-fingers] |
| Special requests | Remark field | [verified: https://jlcpcb.com/help/article/instructions-for-ordering] |

### JLCPCB assembly (PCBA): Basic vs Extended parts
- **Basic** parts stay loaded on the pick-and-place machines, so there is **no loading fee**. **Extended** parts need manual feeder loading, which costs **$3 per unique extended part** on Economic PCBA. "Preferred extended" parts are exempt on Economic orders [verified: https://jlcpcb.com/help/article/pcb-assembly-faqs] [verified: https://jlcpcb.com/help/answers/detail/837-What-is-the-practical-difference-between-Basic-and-Preferred].
- Standard PCBA has a different fee table (feeder loading for all parts). Setup and stencil fees change over time, so quote live prices rather than hard-coding them in lessons [verified: https://jlcpcb.com/help/article/pcb-assembly-price].
- Basic parts list: https://jlcpcb.com/parts/basic_parts [verified].

---

## 7. Library (LCSC / JLCPCB parts)

- The device dialog (`Shift+F`) offers two search engines: **LCSC Electronics** and **EasyEDA**. A part appears in the LCSC engine only if LCSC sells it **and** it has a symbol and footprint. The EasyEDA engine also shows unsold parts [verified: https://prodocs.easyeda.com/en/faq/library/].
- Filters let you narrow by keyword, e.g. type `0603` [verified: https://prodocs.easyeda.com/en/faq/library/].
- Full-offline mode can't search the online library [verified: https://prodocs.easyeda.com/en/faq/library/].
- **C-number:** the LCSC part number (e.g. `C21190`), shown as the "JLCPCB Part #" on jlcpcb.com part pages next to the manufacturer part number. In EasyEDA it lives in the part's supplier part attribute [verified: https://jlcpcb.com/partdetail/LCSC-FD2103/C97681] [verified: https://prodocs.easyeda.com/en/api/reference/pro-api.html]. The BOM and assembly use it to match the exact part.
- **Basic/Extended label inside EasyEDA's library panel** [unverified]. Check on https://jlcpcb.com/parts.
- **Checking that a footprint matches** (teaching checklist, not an official procedure) [unverified]:
  1. The package on the LCSC/JLCPCB part page (e.g. SOIC-8, 0805) matches the footprint name.
  2. Open the footprint preview or the 3D preview and check the pin count and pitch.
  3. Compare the pad layout with the manufacturer datasheet's "recommended land pattern".
  4. Make sure the C-number in the Property panel is the part you intend to order.
- The Footprint Manager (Tools menu, or click the footprint attribute in the Property panel) swaps footprints [verified: https://prodocs.easyeda.com/en/schematic/tools-footprint-manager/].

---

## 8. General facts for lessons

### SMD chip sizes (imperial code → metric code, L × W)
[verified: https://www.lcsc.com/blog/?p=4273]
| Imperial | Metric | Size |
|---|---|---|
| 0402 | 1005 | 1.0 × 0.5 mm |
| 0603 | 1608 | 1.6 × 0.8 mm |
| 0805 | 2012 | 2.0 × 1.25 mm |
| 1206 | 3216 | 3.2 × 1.6 mm |

Pitfall: **metric "0603" = imperial 0201** (0.6 × 0.3 mm). EasyEDA and LCSC use imperial codes [verified: https://www.electronics-notes.com/articles/electronic_components/surface-mount-technology-smd-smt/passive-component-size-codes-overlap-trap.php]. 0805 is the usual hand-soldering-friendly size [verified: https://www.lcsc.com/blog/?p=4273].

### Other dimensions
- **Pin header pitch 2.54 mm (0.1 in)**: standard, but no official source was retrieved [unverified].
- **SOIC-8 pitch 1.27 mm (0.050 in)**, JEDEC MS-012AA [verified: https://en.wikipedia.org/wiki/Small_outline_integrated_circuit].
- **Standard FR-4 thickness 1.6 mm (0.062 in)** [verified: https://jlcpcb.com/blog/standard-pcb-thickness].
- **1 oz copper ≈ 35 µm (1.37 mil)** [verified: https://jlcpcb.com/blog/understanding-pcb-copper-thickness].

### IPC-2221 trace-width formula
`I = k · ΔT^b · A^c`, so `A = ( I / (k · ΔT^b) )^(1/c)`, then `W = A / (T · 1.378)` with T in oz, giving W in mils.
- I = amps, ΔT = °C rise, A = cross-section area in **mils²**.
- **k = 0.048 (external), 0.024 (internal), b = 0.44, c = 0.725** [verified: https://www.digikey.com/zh/resources/conversion-calculators/conversion-calculator-pcb-trace-width] [verified: https://www.lcsc.com/tools/conversion-calculator-pcb-trace-width].
- IPC-2221 is conservative. IPC-2152 is the newer data set [verified: https://www.lcsc.com/tools/conversion-calculator-pcb-trace-width].

### NE555 (8-pin DIP/SOIC)
| Pin | Name |
|---|---|
| 1 | GND |
| 2 | TRIG (trigger, fires below 1/3 VCC) |
| 3 | OUT |
| 4 | RESET (active low) |
| 5 | CONT (control voltage) |
| 6 | THRES (threshold, 2/3 VCC) |
| 7 | DISCH (discharge) |
| 8 | VCC (5–15 V for NE555) |

- Pin names, threshold levels and supply range: [verified: https://www.ti.com/lit/ds/symlink/ne555.pdf].
- Pin-number mapping: the standard pinout, but the search excerpt cut off before the datasheet table [unverified]. Check Table 4-1 in the TI datasheet before publishing.
- Astable: `f ≈ 1.44 / ((R1 + 2·R2) · C)`, with period `T ≈ 0.693 · (R1 + 2·R2) · C`. The capacitor charges through R1+R2 and discharges through R2. Accuracy drops at high frequency, and TI suggests ≤ 100 kHz [verified: https://www.ti.com/lit/ds/symlink/ne555.pdf].
