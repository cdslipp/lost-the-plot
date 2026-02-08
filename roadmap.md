# StagePlotter Roadmap

## P0 — Core Engine (Foundation)

Everything needed for a single usable stage plot.

- ✅ **Categorizer (dev tool)** — Separate SvelteKit app (`categorizer/`) packaged in the monorepo. Lets the dev team browse all 278 catalog items, view each item's image variants, and enrich metadata: display name cleanup, refined `item_type` classification, subcategory assignment, search keywords/tags, default audio inputs (name, short_name, ideal mic/DI, stand type, phantom power), real-world dimensions in inches, backline flag, provision defaults, and connector types. Reads from `app/static/final_assets/items.json`, writes enriched data back. This is a prerequisite for the item catalog, reactive input list, and command palette to function properly.
- ✅ **Schema design** — Formalize the complete data model (`schema-design.md`) covering the catalog item format, runtime SQLite tables, and the Band→Player→Item→Input hierarchy. Must be settled before implementing the data layer.
- ✅ **Drag-and-drop canvas** — Implement the documented canvas architecture (1056×816px letter landscape) with the real-world scale system (2.327 px/in reference scale)
- ✅ **Item catalog / command palette** — Cmd+K searchable palette with 50+ categorized items from `item_data.json` (mics, amps, keyboards, drums, monitors, DI boxes, etc.)
- ✅ **Reactive input list** — Auto-generated input/channel list that stays in sync with plotted items. Add a vocal mic → input list gains a row. Remove it → row disappears.
- ⏳ **Dynamic labeling & linking** — Bidirectional: click an input list row to highlight the item on stage ✅, click a stage item to highlight/flash its input list entry ❌
- ✅ **SQLite action history (undo/redo)** — Every mutation is an action record in SQLite. Undo = reverse the action. Full history scrubbing. This is the backbone of the data layer — build it first.
- ✅ **Keyboard-centric navigation** — Tab through items, arrow keys to nudge (1px increments, boundary-constrained), Escape to deselect. Accessibility-first design.
- ✅ **Save/load projects** — SQLite-backed project persistence via OPFS. One project = one stage plot with metadata.
- ✅ **Basic PDF export** — Single-page PDF rendering of the current plot with input list

## P1 — Templates, Customization & Band Management

Features that make the tool genuinely useful for working musicians and techs.

- **Starter templates** — Pre-built layouts: solo acoustic, duo, trio, 4-piece rock, 5-piece with keys, full band with horns, DJ setup, etc. One-click start, then customize.
- ✅ **Dynamic drum riser** — Configurable riser dimensions (width × depth), snaps to grid, items placed on riser inherit its elevation context
- **Custom instrument/item import** — Upload SVG or raster images as custom stage items with user-defined dimensions and metadata
- **Custom objects** — Lighting uprights, stage boxes, cable runs, barricades, risers of arbitrary size, etc.
- ✅ **Band member roster** — Contact info section (name, role, email, phone) tied to players on the plot
- **Backline management** — Backline requirements annotated on stage plot + generate a standalone backline list (printable/exportable)
- ✅ **Multiple plots per project** — Support bands with different configurations (full show vs. acoustic set)

## P2 — Festival Tools & Interop

Features for production managers, festival organizers, and cross-tool workflows.

- **"No Time" mode** — Generate a shareable link for a band. They answer simple prompted questions (stage left or right? how many monitors? IEM or wedges? backline needs?). Returns a usable stage plot even from non-technical users. Handles graceful fallback when responses are bad, incomplete, or never arrive.

  > _Feasibility: Medium complexity. The questionnaire UI is straightforward. The "generate a reasonable plot from answers" logic needs good defaults and template matching. Could be implemented as a guided wizard that places items based on answers._

- **Console scene file generation** — Fork/integrate concepts from [scnplot](https://github.com/lucaelin/scnplot). Generate pre-named scene files with channels mapped from the input list for:
  - Allen & Heath (dLive, SQ, Avantis)
  - Behringer/Midas (X32, M32, Wing)
  - DiGiCo (SD series)
    > _Feasibility: Medium-high. Each console family has its own file format. A&H and X32/M32 formats are reasonably documented. DiGiCo's format is less open. Start with X32 (best documented) and A&H, add others incrementally._

- **File format support — Penpot export/import** — Export stage plots as Penpot (.penpot) files for further editing in the open-source design tool. Import custom vectors from Penpot as stage items.

  > _Feasibility: Penpot uses a documented SVG-based format. Export is very achievable since we're rendering 2D positioned items. Import of custom vectors is also tractable — parse SVG paths and wrap them as stage items._

- **Font import** — Allow custom fonts for labels and text elements on the plot

  > _Feasibility: Low complexity. Load fonts via FontFace API, store in OPFS or IndexedDB, apply to canvas text rendering._

- **Advanced PDF export** — Multiple methods: high-res raster, vector PDF, multi-page (plot + input list + backline list as separate pages)

- **Local file sync** — Export/import project files to local filesystem. No cloud dependency for basic usage. Drag-and-drop file loading.

## P3 — Cloud, Visual Styles & Advanced Features

Future vision features. Build only after P0-P2 are solid.

- **Cloud service for festivals** — Multi-band management: rack up an ordered list of band plots for a festival day, plan changeovers, share with crew. Auth, team permissions, real-time sync.

  > _Feasibility: High complexity. Requires server infrastructure, auth, real-time collaboration. Consider starting with simple read-only sharing before full collab._

- **Dynamic web viewer (URL-encoded plots)** — Encode an entire stage plot in a long URL so it can be shared without any server storage. Everything happens client-side — decode the URL, render the plot.

  > _Feasibility: Ambitious but possible with caveats. A compressed JSON payload base64-encoded in a URL fragment could work for simple plots. URL length limits vary by browser (2K-64K chars) and intermediaries (many cap at 2K). Realistic approach: use URL fragment (not query string) to avoid server limits, compress aggressively (deflate + base64url), and gracefully fall back to "this plot is too complex for URL sharing" with a file-download alternative. Simple plots (< 20 items) should fit comfortably._

- **Multiple visual styles** — Different rendering themes: clean/minimal, classic/detailed, blueprint, hand-drawn/sketch. Apply globally per plot.

  > _Feasibility: Medium. Requires abstracting the rendering layer so items can be drawn in different styles. Design the item rendering as a pluggable style system from the start (even if only one style ships initially)._

- **DXF/DWG integration** — Export plots in DXF format for CAD workflows. Possibly import venue floor plans in DXF/DWG.

  > _Feasibility: DXF export is achievable — it's a text-based format with good JS libraries (e.g., `dxf-writer`). DWG is proprietary and significantly harder — consider DXF-only initially. Venue floor plan import from DXF is useful but requires parsing complex geometry._

- **Changeover timeline view** — Visual timeline for festival days showing set times, changeover windows, and which plots are active when

---

## Also Implemented (not on original roadmap)

- ✅ **PWA (Progressive Web App)** — Installable, offline-capable via vite-plugin-pwa + service worker
- ✅ **Dark mode** — System-aware + manual toggle via mode-watcher
- ✅ **JSON import/export** — Full plot serialization/deserialization for sharing and backup
- ✅ **Context menus** — Right-click menus on canvas items and stage areas
- ✅ **Monorepo structure** — Workspace-based monorepo with `app/`, `marketing/`, `packages/`
- ✅ **Marketing site** — Separate SvelteKit app at `marketing/`
- ✅ **Tauri desktop skeleton** — Desktop app wrapper at `app/desktop/`
- ✅ **Device detection + redirect** — Mobile/tablet detection with redirect to unsupported-device page
- ✅ **Inspector panel** — Click canvas item to view/edit properties in a sidebar inspector
- ✅ **Musician management** — Add/edit/remove musicians with instrument assignments

---

## Long-Term Vision: Open Device Type Format for Live Production

_A universal, open schema for ALL AV and theatrical tech gear._

[GDTF](https://gdtf-share.com/) proved this works for lighting — a single standardized format describing fixtures so any console, visualizer, or planning tool can consume the same device file. But GDTF only covers lighting. Audio has no equivalent. Video/LED walls have no equivalent. The broader live production industry — where audio, lighting, video, staging, and power all converge on the same stage — has no unified way to describe gear across disciplines.

StagePlotter's enriched catalog (`CatalogItem` in `schema-design.md`) is the seed of this broader format. The Categorizer tool is how we build the initial audio dataset. The schema is designed to be extensible to other domains:

- **Audio gear** (instruments, mics, DI boxes, consoles, monitors, amps) — our starting point. Physical dimensions, audio I/O with connector types, phantom requirements, link modes, preferred miking, backline classification, power requirements, visual representation.
- **Lighting gear** — could wrap or reference GDTF fixture files. A unified schema would let a stage plot tool understand both the SM58 on the vocal mic stand and the moving head on the truss above it.
- **Video/LED walls** — processor configurations, pixel pitch, panel dimensions, power/data daisy-chain topology, input resolution capabilities. A natural extension of the same physical-device-with-connections pattern.
- **Staging & rigging** — trusses, risers, decks, hoists, ground support. Physical dimensions, load ratings, connection points.
- **Power distribution** — distros, transformers, cable types. Amperage, voltage, connector types — already partially captured in our `connectors` and `power_requirements` fields.

The vision, over time:

- **An open spec** — A documented, versioned schema describing any piece of live production equipment. Domain-specific extensions (audio I/O, DMX channels, pixel configurations) layer on top of a shared core (physical dimensions, connectors, power, visual representation).
- **A shared registry** — Like GDTF Share, a community-maintained library of device descriptions spanning all disciplines. Manufacturers or users submit device files.
- **Cross-tool interop** — Stage plot tools, console scene generators, lighting visualizers, video wall configurators, rider builders, rental inventory systems, and production management platforms all consuming the same device descriptions.
- **A standalone project** — Eventually separable from StagePlotter. The format and registry serve the entire live production industry. StagePlotter, shertools, and future tools all become consumers of the spec, not owners.

This is a multi-year vision. The immediate work (Categorizer → enriched audio catalog → StagePlotter runtime) builds toward it incrementally. Every field we add to `CatalogItem` is a step toward the universal format. The schema is designed so that adding a `lighting_properties`, `video_properties`, or `rigging_properties` extension later doesn't break anything — it's just another optional facet on a device.
