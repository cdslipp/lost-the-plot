# StagePlotter Schema Design

## 1. Overview

This document defines the complete data model for StagePlotter across all roadmap tiers (P0–P3). It covers the static catalog format (what ships with the app), the runtime SQLite schema (what lives in the browser/desktop), and the relationship between the two.

### References

- **Existing JSON schemas**: `ref/stageplot/specs/*.json` — define the interchange/export format for `.stageplot` files
- **Data model docs**: `ref/stageplot/docs/DATA_MODEL.md` — establishes the Band→Player→Item→Input hierarchy
- **shertools patterns**: `ref/shertools/` — registry-based device management, config vs. calculations separation, file reference vs. project data

### Core Principles

1. **Band is the root entity.** A stage plot is a _view_ of the Band data, not the other way around. The band's roster, gear, and preferences exist independently of any specific plot layout.
2. **Catalog is static, placement is runtime.** The item catalog ships as a JSON file. When a user places an item on the canvas, a snapshot of its catalog data is captured into the project. This means plots render correctly even if the catalog evolves.
3. **Actions are the source of truth for undo.** Every mutation creates an action record. Undo/redo operates on these records, not on diffing state.
4. **Derived state is computed, not stored.** The input list, channel assignments, and backline requirements are derived reactively from placed items and their catalog metadata. They can be cached for export but are not the source of truth.

---

## 2. Catalog Item Schema (Categorizer Output)

The Categorizer app enriches the raw `items.json` (~271 items with `name`, `item_type`, `variants`, `path`) into a fully described catalog. This enriched JSON ships as a static asset with the app.

### Item Types

18 physically-descriptive types. The key insight: types describe what the **physical thing IS**, not its audio role.

```
instrument | amp | drumset | microphone | monitor | speaker | di_box | stagebox |
mixer | pedal | cable_connector | person | furniture | stand | stagecraft | equipment |
power | marker | label
```

Audio behavior is **derived** from type (not stored per-item):

- Generates audio inputs: `instrument`, `amp`, `drumset`, `microphone`
- Is monitor output: `monitor`, `speaker`
- Default backline: `instrument`, `amp`, `drumset`
- Signal chain (no own input): `pedal`, `di_box`

### Categories

17 categories:

```
guitars | bass | keys | drums | percussion | strings | winds | amps | mics |
monitors | dj_gear | people | furniture | stagecraft | connectors | equipment | power
```

### CatalogItem

```
CatalogItem:
  slug: string                    # Stable ID, URL-safe (e.g., "fender-deluxe-reverb")
  name: string                    # Display name (cleaned up from current messy names)
  item_type: ItemType             # See Item Types above
  category: string                # See Categories above
  subcategory: string?            # e.g., "electric", "bass", "cymbals", "congas"
  tags: string[]                  # Freeform search keywords
  variants: Record<string, string>  # Existing variant image map (preserved from current data)
  path: string                    # Asset directory path (preserved)
  brand: string                   # Manufacturer brand (e.g., "Fender", "Marshall", "Ampeg")
  model: string                   # Specific model (e.g., "Deluxe Reverb", "JCM800", "SVT")
  common_models: BrandModel[]     # For generic items: real-world products this might represent
  default_inputs: DefaultInput[]  # Audio inputs this item generates when placed
  dimensions: Dimensions?         # Real-world size in inches
  provision_default: enum?        # "artist_provided" | "venue_provided" | "rental"
  is_backline: boolean            # Whether this shows on backline requirement lists
  connectors: string[]?           # "XLR" | "TRS" | "TS" | "TRRS" | "MIDI" | "USB" | "IEC" | "speakon" | "powercon"
  power_requirements: string?     # e.g., "120V AC", "9V DC", "phantom"
  auto_number_prefix: string      # Template for auto-numbering: "Gtr", "Keys", "Vox" (substituted as "Gtr 1", "Gtr 2")
  person_subcategory: enum        # "" | "player" | "crew" | "generic" (for person-typed items only)
  notes: string?                  # Dev notes
```

### DefaultInput

Describes an audio input that this item generates when placed on the canvas. For example, a kick drum generates two inputs ("Kick In" and "Kick Out"), a keyboard generates a stereo pair ("Keys L", "Keys R").

```
DefaultInput:
  name: string                    # "Kick In", "Acoustic DI", "Keys L"
  short_name: string              # Console scribble strip: "KikIn", "AcDI", "KeysL"
  ideal_device: GearPreference?   # Preferred mic/DI (uses existing gear-preference spec)
  stand: enum                     # "none" | "short_boom" | "tall_boom" | "straight"
  phantom_power: boolean
  link_mode: enum                 # "mono" | "stereo_pair" | "stereo_sum"
```

### Dimensions

Real-world physical dimensions in inches, used for accurate scale rendering on the canvas.

```
Dimensions:
  width_in: number                # Width in inches (audience perspective)
  depth_in: number                # Depth in inches (front to back)
  height_in: number?              # Height (relevant for stacking, risers)
```

### BrandModel

A brand + model pair, used in `common_models` to list real-world products a generic catalog item might represent.

```
BrandModel:
  brand: string                   # e.g., "Nord", "Roland", "Yamaha"
  model: string                   # e.g., "Stage 4", "FP-88", "CP88"
```

### GearPreference

From the existing `gear-preference-1.0.0.json` schema. Allows specifying preferred, allowed, and disallowed gear for an input.

```
GearPreference:
  preferred: Gear[]?
  allowed: Gear[]?
  disallowed: Gear[]?
```

### Gear

From the existing `gear-1.0.0.json` schema.

```
Gear:
  id: string
  name: string
  brand: string?
  model: string?
  version: string?
  connectors: string[]?
  notes: string?
```

---

## 3. Runtime SQLite Schema — P0 (Core Engine)

Tables for the main PWA. Uses SQLite via OPFS (web) or native SQLite (Tauri desktop).

### projects

One project = one band's setup.

```sql
CREATE TABLE projects (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name              TEXT NOT NULL DEFAULT 'Untitled',
  revision_date     TEXT DEFAULT (date('now')),
  canvas_width      INTEGER DEFAULT 1056,
  canvas_height     INTEGER DEFAULT 816,
  metadata          TEXT,  -- JSON blob for extensibility
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);
```

### players

Musicians in the band.

```sql
CREATE TABLE players (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  instrument        TEXT DEFAULT '',
  sort_order        INTEGER DEFAULT 0
);
```

### placed_items

Items placed on the canvas with position and visual state.

```sql
CREATE TABLE placed_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  catalog_slug      TEXT,               -- FK into static catalog (CatalogItem.slug)
  name              TEXT NOT NULL DEFAULT '',
  current_variant   TEXT DEFAULT 'default',
  pos_x             REAL NOT NULL DEFAULT 0,
  pos_y             REAL NOT NULL DEFAULT 0,
  width             REAL NOT NULL DEFAULT 80,
  height            REAL NOT NULL DEFAULT 60,
  zone              TEXT,               -- DSL/DSC/DSR/USL/USC/USR
  rotation          REAL DEFAULT 0,
  sort_order        INTEGER DEFAULT 0,
  player_id         INTEGER REFERENCES players(id),
  provision         TEXT,               -- Override catalog default
  item_data         TEXT                -- JSON snapshot of catalog data at placement time
);
```

### inputs

Audio connections, auto-generated from catalog defaults when an item is placed.

```sql
CREATE TABLE inputs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  placed_item_id    INTEGER REFERENCES placed_items(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  short_name        TEXT DEFAULT '',
  color             TEXT,               -- red/orange/yellow/green/blue/indigo/violet
  linked_to         INTEGER REFERENCES inputs(id), -- Self-ref for stereo pairs
  ideal_device      TEXT,               -- JSON GearPreference
  stand             TEXT DEFAULT 'none',
  phantom_power     BOOLEAN DEFAULT 0,
  sort_order        INTEGER DEFAULT 0
);
```

### channels

Console channel assignments.

```sql
CREATE TABLE channels (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number            INTEGER NOT NULL,
  input_id          INTEGER REFERENCES inputs(id),
  name              TEXT DEFAULT '',
  short_name        TEXT DEFAULT '',
  color             TEXT
);
```

### outputs

Monitors: wedges, IEMs, sidefills, subs.

```sql
CREATE TABLE outputs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  player_id         INTEGER REFERENCES players(id),
  name              TEXT NOT NULL,
  type              TEXT DEFAULT 'wedge', -- wedge/iem_stereo/iem_mono/sidefill/sub
  sort_order        INTEGER DEFAULT 0
);
```

### monitor_mixes

What each output hears — the mix send levels.

```sql
CREATE TABLE monitor_mixes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  output_id         INTEGER NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
  input_id          INTEGER NOT NULL REFERENCES inputs(id) ON DELETE CASCADE,
  level             REAL DEFAULT 0.5     -- 0.0-1.0 relative
);
```

### actions

Undo/redo backbone. Every mutation creates a record.

```sql
CREATE TABLE actions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action_type       TEXT NOT NULL,       -- "create" | "update" | "delete" | "move" | "batch"
  entity_type       TEXT NOT NULL,       -- "placed_item" | "input" | "player" | "channel" | "output"
  entity_id         TEXT,
  before_state      TEXT,                -- JSON snapshot before
  after_state       TEXT,                -- JSON snapshot after
  timestamp         TEXT DEFAULT (datetime('now')),
  sequence          INTEGER NOT NULL     -- Monotonic ordering for undo stack
);
```

---

## 4. Runtime SQLite Schema — P1 (Templates, Band Management, Backline)

### persons

Contacts: tour manager, production manager, FOH engineer, band members, etc.

```sql
CREATE TABLE persons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  player_id         INTEGER REFERENCES players(id),  -- Nullable: not all contacts are players
  name              TEXT NOT NULL,
  role              TEXT,               -- "Tour Manager" | "Production Manager" | "FOH Engineer" | "Monitor Engineer" | "Backline Tech" | "Stage Manager" | "Artist" | custom
  pronouns          TEXT,
  phone             TEXT,
  email             TEXT
);
```

### templates

Starter layouts for quick project creation.

```sql
CREATE TABLE templates (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT,               -- "solo" | "duo" | "trio" | "quartet" | "full_band" | "dj" | "orchestra" | "custom"
  snapshot          TEXT NOT NULL,       -- JSON: full project state (placed_items, inputs, players, outputs)
  thumbnail         TEXT,               -- Base64 PNG preview
  is_builtin        BOOLEAN DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now'))
);
```

### backline_notes

Additional backline annotations on placed items. Works alongside `placed_items.provision` and the catalog `is_backline` flag.

```sql
CREATE TABLE backline_notes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  placed_item_id    INTEGER REFERENCES placed_items(id),
  gear_preference   TEXT,               -- JSON GearPreference (preferred/allowed/disallowed)
  notes             TEXT,
  is_critical       BOOLEAN DEFAULT 0   -- Must-have vs nice-to-have
);
```

### custom_items

User-uploaded images as custom stage items.

```sql
CREATE TABLE custom_items (
  id                TEXT PRIMARY KEY,
  project_id        TEXT REFERENCES projects(id),  -- Nullable: can be global
  name              TEXT NOT NULL,
  item_type         TEXT DEFAULT 'accessory',
  category          TEXT DEFAULT 'custom',
  image_data        TEXT,               -- Base64 or OPFS path
  image_format      TEXT,               -- "svg" | "png" | "jpg"
  width_in          REAL,
  depth_in          REAL,
  default_inputs    TEXT,               -- JSON DefaultInput[]
  created_at        TEXT DEFAULT (datetime('now'))
);
```

### plot_variants

Multiple plot configurations per project (e.g., full show vs. acoustic set).

```sql
CREATE TABLE plot_variants (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,       -- "Full Show" | "Acoustic Set" | "Soundcheck"
  is_default        BOOLEAN DEFAULT 0,
  snapshot          TEXT NOT NULL,       -- JSON: placed_items + positions for this variant
  sort_order        INTEGER DEFAULT 0
);
```

---

## 5. Runtime SQLite Schema — P2 (Festival Tools, Interop)

### questionnaire_responses

Responses from the "No Time" guided questionnaire flow.

```sql
CREATE TABLE questionnaire_responses (
  id                TEXT PRIMARY KEY,
  project_id        TEXT REFERENCES projects(id),
  band_name         TEXT NOT NULL,
  submitted_at      TEXT DEFAULT (datetime('now')),
  status            TEXT DEFAULT 'pending', -- pending/complete/expired
  responses         TEXT NOT NULL,       -- JSON: answers to guided questions
  generated_plot    TEXT                 -- JSON: auto-generated plot from responses
);
```

### console_profiles

Console definitions for scene file export.

```sql
CREATE TABLE console_profiles (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,       -- "X32 Default", "dLive S5000"
  console_family    TEXT NOT NULL,       -- "x32" | "m32" | "wing" | "dlive" | "sq" | "avantis" | "sd_series"
  console_model     TEXT,
  channel_count     INTEGER,
  bus_count         INTEGER,
  format_version    TEXT,               -- Console file format version
  template_data     TEXT                -- JSON: default channel naming, color schemes
);
```

---

## 6. Runtime SQLite Schema — P3 (Cloud, Advanced)

### sync_state

Cloud sync metadata.

```sql
CREATE TABLE sync_state (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id        TEXT NOT NULL REFERENCES projects(id),
  remote_id         TEXT,               -- Server-side project ID
  last_synced       TEXT,
  sync_status       TEXT DEFAULT 'local', -- local/syncing/synced/conflict
  remote_version    INTEGER DEFAULT 0
);
```

### festival_days / festival_slots

Festival day management for multi-band scheduling.

```sql
CREATE TABLE festival_days (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,       -- "Saturday Main Stage"
  date              TEXT,
  venue             TEXT,
  sort_order        INTEGER DEFAULT 0
);

CREATE TABLE festival_slots (
  id                TEXT PRIMARY KEY,
  festival_day_id   TEXT NOT NULL REFERENCES festival_days(id),
  project_id        TEXT REFERENCES projects(id),  -- Link to a band's project
  band_name         TEXT NOT NULL,
  start_time        TEXT,
  end_time          TEXT,
  changeover_minutes INTEGER DEFAULT 30,
  sort_order        INTEGER DEFAULT 0,
  notes             TEXT
);
```

### style_presets

Visual rendering themes.

```sql
CREATE TABLE style_presets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,       -- "Clean", "Blueprint", "Hand-drawn"
  style_data        TEXT NOT NULL,       -- JSON: colors, fonts, line styles, fill patterns
  is_builtin        BOOLEAN DEFAULT 0
);
```

---

## 7. Data Flow Patterns

Influenced by shertools reference (`ref/shertools/`):

### Registry Pattern

Catalog items are loaded from the static JSON file and cached in memory (similar to `VideoWallDeviceManager` in shertools). Individual items are looked up by slug. The catalog is read-only at runtime — enrichment happens offline in the Categorizer.

### Snapshot at Placement

When an item is placed on the canvas, its catalog data is snapshotted into `placed_items.item_data`. This means:

- The plot renders correctly even if the catalog changes in a future app update
- Users can override catalog defaults (rename inputs, change dimensions) without affecting the source catalog
- Export files are self-contained

### Configuration + Derived State

User configuration (what items are placed, where, which player owns them) is stored in SQLite. Derived data is computed reactively:

- **Input list**: derived from `placed_items` → `inputs` (auto-generated from catalog `default_inputs`)
- **Channel assignments**: derived from `inputs` → `channels` (auto-numbered)
- **Backline list**: derived from `placed_items` where `is_backline = true`
- **Monitor mix matrix**: derived from `outputs` × `inputs`

These can be cached/materialized for export but the placed items + inputs remain the source of truth.

### Actions as Undo Backbone

Every mutation creates an action record with before/after state snapshots. The current state is maintained in the main tables (not reconstructed from actions). Undo = apply `before_state`, redo = apply `after_state`. The `sequence` column provides monotonic ordering for the undo stack.

---

## 8. Relationship to Existing JSON Schemas

The `ref/stageplot/specs/` schemas define the **export/interchange format** (what a `.stageplot` file looks like). The SQLite tables are the **runtime storage format**. They map as follows:

| JSON Schema                  | SQLite Table(s)                                             |
| ---------------------------- | ----------------------------------------------------------- |
| `band-1.0.0.json`            | `projects` (root)                                           |
| `player-1.0.0.json`          | `players` + `persons`                                       |
| `item-1.0.0.json`            | `placed_items` + catalog                                    |
| `input-1.0.0.json`           | `inputs`                                                    |
| `channel-1.0.0.json`         | `channels`                                                  |
| `output-1.0.0.json`          | `outputs`                                                   |
| `monitormix-1.0.0.json`      | `monitor_mixes`                                             |
| `gear-1.0.0.json`            | Used within `GearPreference` JSON blobs                     |
| `gear-preference-1.0.0.json` | Stored as JSON in `ideal_device`, `gear_preference` columns |
| `person-1.0.0.json`          | `persons`                                                   |
| `stage-plot-1.0.0.json`      | Export view generated from all tables                       |

The export process joins across tables to produce the JSON interchange format. The import process decomposes the JSON into the normalized SQLite tables.
