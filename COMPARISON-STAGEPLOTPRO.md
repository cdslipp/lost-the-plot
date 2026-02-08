# Stage Plot Pro Feature Comparison

Comparing StagePlotter against **Stage Plot Pro** (v2.9.9.2, no longer maintained — developer deceased). Stage Plot Pro was a $39.99 Mac/Windows desktop app with ~300 equipment items.

---

## Features We Already Have (or Have Planned)

| SPP Feature                        | Our Status      | Notes                                                    |
| ---------------------------------- | --------------- | -------------------------------------------------------- |
| Drag-and-drop instrument placement | Implemented     | Cmd+K catalog palette + drag                             |
| 300+ equipment items               | Implemented     | 270+ with richer metadata                                |
| Realistic equipment graphics       | Implemented     | PNG variants with orientations (L/R/LA/RA)               |
| Free positioning on stage          | Implemented     | Full canvas drag                                         |
| Undo/Redo                          | Implemented     | StateHistory via runed                                   |
| Copy/Paste                         | Implemented     | Keyboard shortcuts                                       |
| Delete items                       | Implemented     | Delete key + context menu                                |
| Input list / channel assignment    | Implemented     | StagePatch with 8/16/24/32/48 channel modes              |
| Input list grouping options        | Implemented     | Multiple channel count modes                             |
| PDF export                         | Implemented     | 2-page PDF (plot + input list)                           |
| Custom stage dimensions            | Implemented     | Stage deck builder with configurable sizes               |
| Scale system / measurements        | Implemented     | 2.327 px/inch real-world scale                           |
| Dark/light mode                    | Implemented     | SPP didn't have this at all                              |
| Grid display                       | Implemented     | Toggle grid                                              |
| Text on stage                      | Implemented     | Item labels/annotations                                  |
| Stage curtains/backdrop            | Implemented     | Via stagecraft items in catalog                          |
| Favorites / frequently used items  | Implemented     | Catalog with categories                                  |
| Keyboard shortcuts                 | Implemented     | Arrow nudge, Tab nav, Escape, etc.                       |
| Output / monitor list              | Partial         | StagePatch has output placeholder, not fully implemented |
| Monitor mix details                | Planned         | In schema-design, not yet built                          |
| Custom item import                 | Planned         | Detailed strategy doc (docs/custom-items-strategy.md)    |
| Saved groups (reusable item sets)  | Planned         | Templates system spec (docs/specs/templates.md)          |
| Alignment tools                    | Planned/Partial | Multi-select exists; explicit align L/R/T/B not yet      |

---

## Features We're Missing (Not Implemented AND Not Planned)

| SPP Feature                   | Impact      | Description                                                                                                                                            |
| ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drawing tools (lines, shapes) | Medium      | SPP had a full Draw window with line/shape tools, shift-constrain, and grey/black/white fills. Useful for cable runs, stage zones, custom annotations. |
| Background/stage image import | Medium      | Import a venue photo or CAD drawing as the stage background, overlay instruments on top. Useful for venue-specific plots.                              |
| Free rotation of placed items | Medium-High | SPP had rotate/flip transforms for placed items. We have orientation variants (L/R/LA/RA) from the catalog but no free rotation after placement.       |
| Resize items on canvas        | Medium      | SPP let you resize items after placement. We use fixed sizes from the catalog. Drag-to-resize handles would improve UX.                                |
| Z-order / layering controls   | Low-Medium  | Explicit send-to-front/send-to-back controls for overlapping items.                                                                                    |
| "Leave on Dock" (stamp mode)  | Low         | Keep an item selected to place multiple copies without returning to catalog. Useful for quickly placing 6 wedge monitors, etc.                         |
| Image export (JPEG/PNG)       | Low         | SPP exported to JPEG. We export PDF and JSON but not raster images. Easy to add.                                                                       |
| Colored text in input list    | Low         | SPP supported colored channel text. Minor visual feature.                                                                                              |
| Metric/Imperial toggle        | Low         | SPP let users switch measurement systems. We use a fixed px/inch scale.                                                                                |

---

## Features Where We Already Exceed Stage Plot Pro

None of these existed in Stage Plot Pro:

- Band management (multiple bands, personnel, contacts)
- Songs, gigs, and setlists
- PWA / offline-first (works in browser, no install needed)
- JSON import/export (open format, not proprietary)
- Command palette (Cmd+K) for fast item search
- Multi-selection with box select (Selecto)
- Inspector panel for item properties
- Context menus
- Dark mode
- Open source
- Cross-platform via browser (not just Mac/Windows)
- Planned: Quick Create Wizard for non-technical users
- Planned: Console scene export (X32, M32, dLive)
- Planned: Cloud sharing
- Planned: Backline management with provision tracking

---

## Bottom Line

Stage Plot Pro had **2 meaningful feature areas we lack**: drawing tools (lines/shapes) and free rotation/resize of placed items. These are canvas manipulation features worth considering.

Everything else is either already built, already planned with detailed specs, or low-impact. Our biggest advantages are in data management and workflow (band/gig/setlist management, PWA, open format) — areas SPP never touched.
