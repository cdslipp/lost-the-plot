# StagePlotter File Format Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2025-02-07

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [`.stageplot` — Band Project File](#2-stageplot--band-project-file)
3. [`.inputlist` — Single Plot Export](#3-inputlist--single-plot-export)
4. [Versioning Strategy](#4-versioning-strategy)
5. [ID Strategy](#5-id-strategy)
6. [Round-Trip Fidelity Requirements](#6-round-trip-fidelity-requirements)
7. [Future Extensibility](#7-future-extensibility)
8. [Full Examples](#8-full-examples)
9. [Tauri File Association Config](#9-tauri-file-association-config)

---

## 1. Overview & Goals

StagePlotter defines two file formats for saving, opening, and sharing stage plot data:

| Format       | Extension    | Purpose                                                 |
| ------------ | ------------ | ------------------------------------------------------- |
| Band Project | `.stageplot` | Save/open a complete band project (all plots, all data) |
| Input List   | `.inputlist` | Share a single plot with venues and sound engineers     |

### Design Principles

- **JSON-based**: Both formats are plain JSON — human-readable, diffable, and debuggable.
- **Cross-platform**: Works identically in the browser (download/upload via `<a>`/`<input>`) and in Tauri (native file dialogs with registered extensions).
- **Self-contained**: All data needed to render a plot is embedded in the file. No external asset dependencies (catalog snapshots are inlined). No dangling references.
- **Versioned**: Every file carries a `format_version` string. The version determines how the file is parsed, and a clear migration path handles older files.

### Relationship Between Formats

```
┌─────────────────────────────┐
│   .stageplot (full project) │
│                             │
│  Band ─┬─ Players          │
│        ├─ Items             │
│        ├─ Inputs/Channels   │    export single plot
│        ├─ Outputs           │  ─────────────────────►  .inputlist
│        ├─ Monitor Mixes     │    (flattened, venue-friendly)
│        └─ Contacts          │
│                             │
│  Plots[] (layout views)     │
└─────────────────────────────┘
```

A `.stageplot` is the canonical source of truth. A `.inputlist` is a derived, flattened snapshot of a single plot — designed to be sent to a venue or sound engineer with zero knowledge of StagePlotter.

---

## 2. `.stageplot` — Band Project File

### File Identity

| Field             | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| Extension         | `.stageplot`                                                  |
| MIME type         | `application/vnd.stageplotter.project+json`                   |
| Encoding          | UTF-8                                                         |
| Content (Phase 1) | Plain JSON                                                    |
| Content (Phase 2) | ZIP with `manifest.json` + `assets/` (when custom items ship) |

Phase 2 detection: readers check the first byte — `{` means JSON, `PK` (0x50 0x4B) means ZIP.

### Root Structure

```jsonc
{
	"$schema": "https://stageplotter.com/schemas/stageplot-1.0.0.json",
	"format_version": "1.0.0",
	"type": "band_project",

	"file_metadata": {
		/* ... */
	},
	"band": {
		/* ... */
	},
	"plots": [
		/* ... */
	]
}
```

### `file_metadata`

Metadata about the file itself — when it was created, by what, and an integrity checksum.

```jsonc
{
	"created_at": "2025-02-07T14:30:00Z", // ISO 8601
	"modified_at": "2025-02-07T15:45:00Z", // ISO 8601
	"created_by": {
		"app": "StagePlotter",
		"version": "0.1.0", // App semver from package.json
		"platform": "web" // "web" | "tauri-macos" | "tauri-windows" | "tauri-linux"
	},
	"checksum": "sha256:a1b2c3..." // Optional. SHA-256 of the JSON content (excluding this field)
}
```

| Field                 | Type              | Required | Description                                      |
| --------------------- | ----------------- | -------- | ------------------------------------------------ |
| `created_at`          | string (ISO 8601) | Yes      | When the file was first saved                    |
| `modified_at`         | string (ISO 8601) | Yes      | When the file was last saved                     |
| `created_by.app`      | string            | Yes      | Always `"StagePlotter"`                          |
| `created_by.version`  | string (semver)   | Yes      | App version                                      |
| `created_by.platform` | string            | Yes      | Runtime platform                                 |
| `checksum`            | string            | No       | `"sha256:{hex}"` hash for integrity verification |

### `band`

The band is the root entity. It owns all players, items, inputs, channels, outputs, monitor mixes, and contacts. This matches the hierarchy defined in [DATA_MODEL.md](./DATA_MODEL.md): the Band is the single source of truth, and plots are views derived from it.

```jsonc
{
	"id": "b-550e8400-e29b-41d4-a716-446655440000",
	"name": "The Stageplotters",

	"players": [
		/* Player[] */
	],
	"contacts": [
		/* Person[] */
	],
	"items": [
		/* Item[] */
	],
	"inputs": [
		/* Input[] */
	],
	"channels": [
		/* Channel[] */
	],
	"outputs": [
		/* Output[] */
	],
	"monitor_mixes": [
		/* MonitorMix[] */
	]
}
```

| Field           | Type         | Required | Description                                      |
| --------------- | ------------ | -------- | ------------------------------------------------ |
| `id`            | string       | Yes      | Unique band identifier                           |
| `name`          | string       | Yes      | Band/artist name                                 |
| `players`       | Player[]     | Yes      | Musicians in the band                            |
| `contacts`      | Person[]     | No       | Crew contacts (tour manager, FOH engineer, etc.) |
| `items`         | Item[]       | Yes      | All gear/equipment owned by the band             |
| `inputs`        | Input[]      | Yes      | All audio inputs                                 |
| `channels`      | Channel[]    | No       | Console channel assignments                      |
| `outputs`       | Output[]     | Yes      | Monitor outputs                                  |
| `monitor_mixes` | MonitorMix[] | No       | Per-player monitor mix preferences               |

#### `Player`

A musician in the band. Each player embeds their `person` data inline (no dangling references to a separate persons table).

```jsonc
{
	"id": "player-1",
	"person": {
		"name": "Alex Rivera",
		"pronouns": "they/them",
		"phone": "+1-555-0101",
		"email": "alex@example.com"
	},
	"item_ids": ["item-1", "item-2"],
	"output_ids": ["output-1"]
}
```

| Field        | Type     | Required | Description                            |
| ------------ | -------- | -------- | -------------------------------------- |
| `id`         | string   | Yes      | Unique player identifier               |
| `person`     | Person   | Yes      | Inline person data (see Person below)  |
| `item_ids`   | string[] | No       | IDs of items this player uses          |
| `output_ids` | string[] | No       | IDs of monitor outputs for this player |

#### `Person`

Contact information for a person. Used both inline in `Player` and in the top-level `contacts` array.

```jsonc
{
	"name": "Jordan Hayes",
	"role": "Front of House Engineer",
	"pronouns": "she/her",
	"phone": "+1-555-0102",
	"email": "jordan@example.com"
}
```

| Field      | Type   | Required | Description                                                                                                                                                              |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`     | string | Yes      | Full name                                                                                                                                                                |
| `role`     | string | No       | One of: `"Tour Manager"`, `"Production Manager"`, `"Front of House Engineer"`, `"Monitor Engineer"`, `"Backline Tech"`, `"Lighting Designer"`, `"Video Tech"`, `"Other"` |
| `pronouns` | string | No       | e.g. `"she/her"`, `"he/him"`, `"they/them"`                                                                                                                              |
| `phone`    | string | No       | Phone number                                                                                                                                                             |
| `email`    | string | No       | Email address                                                                                                                                                            |

#### `Item`

A physical item that can be placed on a stage plot. Items are defined at the band level (the band owns the gear) and placed at the plot level (each plot shows where things go).

The `catalog_snapshot` field follows the "Snapshot at Placement" pattern: the full catalog entry is embedded so the file is self-contained and can render correctly without access to any external catalog.

```jsonc
{
	"id": "item-1",
	"name": "Fender Deluxe Reverb",
	"category": "amps",
	"provision": "artist_provided",
	"backline_request": {
		"preferred": [
			{
				"id": "gear-1",
				"name": "Deluxe Reverb",
				"brand": "Fender",
				"model": "Deluxe Reverb",
				"version": "'65 Reissue"
			}
		],
		"allowed": [
			{ "id": "gear-2", "name": "Twin Reverb", "brand": "Fender", "model": "Twin Reverb" }
		],
		"disallowed": []
	},
	"input_ids": ["input-1"],
	"catalog_snapshot": {
		"type": "egt",
		"category": "amps",
		"variants": { "default": { "src": "img/egt/amp-fender-deluxe.svg", "width": 57, "height": 43 } }
		// ... full catalog item data as stored in item_data
	}
}
```

| Field              | Type           | Required | Description                                                                                          |
| ------------------ | -------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `id`               | string         | Yes      | Unique item identifier                                                                               |
| `name`             | string         | Yes      | Display name                                                                                         |
| `category`         | string         | No       | Category: `"guitars"`, `"amps"`, `"drums"`, `"keys"`, `"mic"`, `"monitor"`, `"di"`, `"pedals"`, etc. |
| `provision`        | string         | No       | `"artist_provided"`, `"venue_provided"`, or `"rental"`                                               |
| `backline_request` | GearPreference | No       | Gear preference with preferred/allowed/disallowed lists                                              |
| `input_ids`        | string[]       | No       | IDs of inputs generated by this item                                                                 |
| `catalog_snapshot` | object         | No       | Full catalog entry data (verbatim `item_data` JSON blob from SQLite)                                 |

#### `GearPreference`

A prioritized gear request following the "CSS Fonts" rule from [DATA_MODEL.md](./DATA_MODEL.md).

| Field        | Type   | Required | Description                               |
| ------------ | ------ | -------- | ----------------------------------------- |
| `preferred`  | Gear[] | No       | Most desired gear, in order of preference |
| `allowed`    | Gear[] | No       | Acceptable alternatives                   |
| `disallowed` | Gear[] | No       | Explicitly unacceptable gear              |

#### `Gear`

A specific piece of equipment.

| Field                | Type     | Required | Description                                                                     |
| -------------------- | -------- | -------- | ------------------------------------------------------------------------------- |
| `id`                 | string   | Yes      | Unique gear identifier                                                          |
| `name`               | string   | Yes      | Common name (e.g. `"Deluxe Reverb"`)                                            |
| `brand`              | string   | No       | Manufacturer                                                                    |
| `model`              | string   | No       | Model name/number                                                               |
| `version`            | string   | No       | Revision or mark (e.g. `"'65 Reissue"`, `"Mk II"`)                              |
| `release_year`       | integer  | No       | Year released                                                                   |
| `power_requirements` | string   | No       | Power details (e.g. `"120V AC"`)                                                |
| `connectors`         | string[] | No       | Connector types: `"XLR"`, `"TRS"`, `"TS"`, `"TRRS"`, `"MIDI"`, `"USB"`, `"IEC"` |
| `notes`              | string   | No       | Any additional notes                                                            |

#### `Input`

A single audio input for the sound system.

```jsonc
{
	"id": "input-1",
	"name": "Gtr Amp",
	"short_name": "Gtr",
	"color": "blue",
	"channel_id": "ch-1",
	"linked_to": null,
	"stand": "short_boom",
	"phantom_power": false,
	"ideal_device": {
		"preferred": [{ "id": "gear-10", "name": "SM57", "brand": "Shure", "model": "SM57" }]
	}
}
```

| Field           | Type           | Required | Description                                                                          |
| --------------- | -------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`            | string         | Yes      | Unique input identifier                                                              |
| `name`          | string         | Yes      | Full name (e.g. `"Kick In"`, `"Stereo Keys L"`)                                      |
| `short_name`    | string         | No       | Abbreviated name (e.g. `"Kik"`)                                                      |
| `color`         | string         | No       | One of: `"red"`, `"orange"`, `"yellow"`, `"green"`, `"blue"`, `"indigo"`, `"violet"` |
| `channel_id`    | string         | No       | ID of the console channel this input is patched to                                   |
| `linked_to`     | string         | No       | ID of another input this is linked with (e.g. stereo pair)                           |
| `stand`         | string         | No       | `"none"`, `"short_boom"`, `"tall_boom"`, `"straight"`                                |
| `phantom_power` | boolean        | No       | Whether 48V phantom power is required                                                |
| `ideal_device`  | GearPreference | No       | Preferred microphone/DI                                                              |

#### `Channel`

A channel on the mixing console.

| Field        | Type    | Required | Description                                                                          |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------------ |
| `id`         | string  | Yes      | Unique channel identifier                                                            |
| `number`     | integer | Yes      | Console channel number                                                               |
| `name`       | string  | No       | Venue-provided name (e.g. `"Guest Vocal"`)                                           |
| `short_name` | string  | No       | Abbreviated name (e.g. `"Vox"`)                                                      |
| `color`      | string  | No       | One of: `"red"`, `"orange"`, `"yellow"`, `"green"`, `"blue"`, `"indigo"`, `"violet"` |

#### `Output`

A monitor output for a player.

| Field  | Type   | Required | Description                                                    |
| ------ | ------ | -------- | -------------------------------------------------------------- |
| `id`   | string | Yes      | Unique output identifier                                       |
| `name` | string | Yes      | Output name (e.g. `"Wedge 1"`, `"IEM A"`)                      |
| `type` | string | No       | `"wedge"`, `"iem_stereo"`, `"iem_mono"`, `"sidefill"`, `"sub"` |

#### `MonitorMix`

Defines what a player wants to hear in their monitor.

```jsonc
{
	"id": "mix-1",
	"player_id": "player-1",
	"mix": [
		{ "input_id": "input-1", "level": "medium" },
		{ "input_id": "input-3", "level": "high" },
		{ "input_id": "input-5", "level": "lead" }
	]
}
```

| Field       | Type       | Required | Description                          |
| ----------- | ---------- | -------- | ------------------------------------ |
| `id`        | string     | Yes      | Unique mix identifier                |
| `player_id` | string     | Yes      | ID of the player this mix belongs to |
| `mix`       | MixEntry[] | Yes      | Array of input levels                |

**MixEntry**:

| Field      | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `input_id` | string | Yes      | ID of the input                                  |
| `level`    | string | Yes      | `"off"`, `"low"`, `"medium"`, `"high"`, `"lead"` |

### `plots`

An array of plot views. Each plot is a visual layout of the band's items on a stage. A band project can contain multiple plots (e.g. different stage configurations, festival vs. club).

```jsonc
{
	"id": "plot-1",
	"plot_name": "Standard Club Setup",
	"revision_date": "2025-02-07",
	"is_default": true,

	"canvas": {
		"format": "letter",
		"orientation": "landscape",
		"dpi": 96,
		"width": 1100,
		"height": 850
	},

	"stage": {
		"x": 50,
		"y": 50,
		"width": 1000,
		"height": 700,
		"margins": {
			"top": 50,
			"right": 50,
			"bottom": 100,
			"left": 50
		}
	},

	"placed_items": [
		{
			"item_id": "item-1",
			"current_variant": "default",
			"position": {
				"x": 200.0,
				"y": 300.5,
				"width": 57.0,
				"height": 43.0,
				"zone": "DSL",
				"relativeX": -278.0,
				"relativeY": 250.5
			},
			"rotation": 0,
			"sort_order": 0,
			"player_id": "player-1"
		}
	],

	"event": {
		"name": "Friday Night Live",
		"date": "2025-03-15",
		"time": "20:00",
		"venue": "The Blue Note"
	},

	"metadata": {}
}
```

| Field           | Type                | Required | Description                           |
| --------------- | ------------------- | -------- | ------------------------------------- |
| `id`            | string              | Yes      | Unique plot identifier                |
| `plot_name`     | string              | Yes      | Display name for this plot            |
| `revision_date` | string (YYYY-MM-DD) | No       | Date of last revision                 |
| `is_default`    | boolean             | No       | Whether this is the default plot view |
| `canvas`        | Canvas              | Yes      | Canvas dimensions and format          |
| `stage`         | Stage               | Yes      | Stage area within the canvas          |
| `placed_items`  | PlacedItem[]        | Yes      | Items placed on this plot's stage     |
| `event`         | Event               | No       | Event details for this plot           |
| `metadata`      | object              | No       | Arbitrary additional data             |

**Canvas**:

| Field         | Type    | Required | Description                                   |
| ------------- | ------- | -------- | --------------------------------------------- |
| `format`      | string  | Yes      | Paper format: `"letter"`, `"a4"`, `"tabloid"` |
| `orientation` | string  | Yes      | `"landscape"` or `"portrait"`                 |
| `dpi`         | integer | Yes      | Dots per inch (standard: `96`)                |
| `width`       | number  | Yes      | Canvas width in pixels                        |
| `height`      | number  | Yes      | Canvas height in pixels                       |

**Stage**:

| Field     | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| `x`       | number | Yes      | Stage area X origin (px from canvas left)        |
| `y`       | number | Yes      | Stage area Y origin (px from canvas top)         |
| `width`   | number | Yes      | Stage area width in pixels                       |
| `height`  | number | Yes      | Stage area height in pixels                      |
| `margins` | object | Yes      | `{ top, right, bottom, left }` margins in pixels |

**PlacedItem**:

| Field             | Type     | Required | Description                                                      |
| ----------------- | -------- | -------- | ---------------------------------------------------------------- |
| `item_id`         | string   | Yes      | References an item in `band.items`                               |
| `current_variant` | string   | No       | Visual variant (e.g. `"default"`, `"top-down"`)                  |
| `position`        | Position | Yes      | Position and dimensions on canvas                                |
| `rotation`        | number   | No       | Rotation in degrees (default: `0`)                               |
| `sort_order`      | integer  | No       | Z-order (lower = further back). Array ordering is authoritative. |
| `player_id`       | string   | No       | Which player this placed item belongs to                         |

**Position**:

| Field       | Type   | Required | Description                                                      |
| ----------- | ------ | -------- | ---------------------------------------------------------------- |
| `x`         | number | Yes      | X coordinate on canvas (pixels)                                  |
| `y`         | number | Yes      | Y coordinate on canvas (pixels)                                  |
| `width`     | number | Yes      | Item width in pixels                                             |
| `height`    | number | Yes      | Item height in pixels                                            |
| `zone`      | string | No       | Stage zone: `"DSL"`, `"DSC"`, `"DSR"`, `"USL"`, `"USC"`, `"USR"` |
| `relativeX` | number | No       | X position relative to downstage center edge                     |
| `relativeY` | number | No       | Y position relative to downstage edge                            |

**Event**:

| Field   | Type                | Required | Description             |
| ------- | ------------------- | -------- | ----------------------- |
| `name`  | string              | No       | Event name              |
| `date`  | string (YYYY-MM-DD) | No       | Event date              |
| `time`  | string (HH:MM)      | No       | Event time (24h format) |
| `venue` | string              | No       | Venue name              |

---

## 3. `.inputlist` — Single Plot Export

### File Identity

| Field     | Value                                                           |
| --------- | --------------------------------------------------------------- |
| Extension | `.inputlist`                                                    |
| MIME type | `application/vnd.stageplotter.inputlist+json`                   |
| Encoding  | UTF-8                                                           |
| Content   | Plain JSON always (no binary assets — this is a sharing format) |

### Purpose

The `.inputlist` format is what you send to a venue or sound engineer. It contains everything they need — stage layout, input list, output list, contacts, event details — in a single, self-contained file. It is intentionally **flattened and denormalized**: items have their positions inlined, musicians are referenced by name, and internal concepts like monitor mixes and gear preferences are excluded.

### Backward Compatibility

This format is a **superset** of the current `StagePlotExport` type in `ImportExport.svelte`. The existing fields (`version`, `type`, `plot_name`, `revision_date`, `canvas`, `items`, `musicians`, `metadata`) are preserved with the same shape. New fields (`inputs`, `outputs`, `contacts`, `event`, `stage`, `file_metadata`) are additions. Files exported by the current system are valid `.inputlist` files with `type: "stage_plot"` — the new exporter uses `type: "input_list"` but importers should accept both.

### Root Structure

```jsonc
{
	"$schema": "https://stageplotter.com/schemas/inputlist-1.0.0.json",
	"format_version": "1.0.0",
	"type": "input_list",

	"file_metadata": {
		"created_at": "2025-02-07T14:30:00Z",
		"created_by": {
			"app": "StagePlotter",
			"version": "0.1.0",
			"platform": "web"
		},
		"source_band": "The Stageplotters",
		"source_band_id": "b-550e8400-e29b-41d4-a716-446655440000"
	},

	"plot_name": "Standard Club Setup",
	"revision_date": "2025-02-07",

	"canvas": {
		"format": "letter",
		"orientation": "landscape",
		"dpi": 96,
		"width": 1100,
		"height": 850
	},

	"stage": {
		"x": 50,
		"y": 50,
		"width": 1000,
		"height": 700,
		"margins": { "top": 50, "right": 50, "bottom": 100, "left": 50 }
	},

	"items": [
		/* ... */
	],
	"musicians": [
		/* ... */
	],
	"inputs": [
		/* ... */
	],
	"outputs": [
		/* ... */
	],
	"contacts": [
		/* ... */
	],
	"event": {
		/* ... */
	},
	"metadata": {}
}
```

### Field Reference

| Field            | Type                | Required | Description                                                               |
| ---------------- | ------------------- | -------- | ------------------------------------------------------------------------- |
| `$schema`        | string              | No       | Schema URL                                                                |
| `format_version` | string              | Yes      | Semver format version                                                     |
| `type`           | string              | Yes      | `"input_list"` (importers also accept `"stage_plot"` for backward compat) |
| `file_metadata`  | object              | No       | Creation info + source band traceability                                  |
| `plot_name`      | string              | Yes      | Plot name (typically the band name)                                       |
| `revision_date`  | string (YYYY-MM-DD) | No       | Date of last revision                                                     |
| `canvas`         | Canvas              | Yes      | Canvas dimensions (see `.stageplot` Canvas)                               |
| `stage`          | Stage               | No       | Stage area (see `.stageplot` Stage)                                       |
| `items`          | InputListItem[]     | Yes      | Items with positions inlined                                              |
| `musicians`      | Musician[]          | No       | Musicians list                                                            |
| `inputs`         | InputListInput[]    | No       | Audio inputs (the actual input list)                                      |
| `outputs`        | InputListOutput[]   | No       | Monitor outputs                                                           |
| `contacts`       | InputListContact[]  | No       | Crew contacts                                                             |
| `event`          | Event               | No       | Event details                                                             |
| `metadata`       | object              | No       | Arbitrary additional data                                                 |

#### `file_metadata`

| Field            | Type              | Required | Description                                        |
| ---------------- | ----------------- | -------- | -------------------------------------------------- |
| `created_at`     | string (ISO 8601) | No       | When exported                                      |
| `created_by`     | object            | No       | `{ app, version, platform }`                       |
| `source_band`    | string            | No       | Name of the band this was exported from            |
| `source_band_id` | string            | No       | ID of the source band (for re-import traceability) |

#### `InputListItem`

Items are flattened — position is inlined, and the full `itemData` blob is preserved for rendering.

```jsonc
{
	"id": 1,
	"name": "Lead Guitar",
	"type": "egt",
	"category": "amps",
	"currentVariant": "default",
	"position": {
		"x": 200,
		"y": 300,
		"width": 57,
		"height": 43,
		"zone": "DSL",
		"relativeX": -278,
		"relativeY": 250
	},
	"channel": "1",
	"musician": "Alex Rivera",
	"itemData": {
		/* full catalog snapshot */
	}
}
```

| Field            | Type              | Required | Description                                                           |
| ---------------- | ----------------- | -------- | --------------------------------------------------------------------- |
| `id`             | integer \| string | Yes      | Item identifier (integer for backward compat, string for new exports) |
| `name`           | string            | Yes      | Display name                                                          |
| `type`           | string            | Yes      | Item type (e.g. `"egt"`, `"drum"`, `"mic"`, `"keys"`)                 |
| `category`       | string            | No       | Category for grouping                                                 |
| `currentVariant` | string            | No       | Visual variant                                                        |
| `position`       | Position          | Yes      | Position on canvas (same Position schema as `.stageplot`)             |
| `channel`        | string            | No       | Channel assignment (by name/number)                                   |
| `musician`       | string            | No       | Assigned musician name                                                |
| `itemData`       | object            | No       | Full catalog data for rendering                                       |

#### `Musician`

```jsonc
{ "id": 1, "name": "Alex Rivera", "instrument": "Guitar" }
```

| Field        | Type              | Required | Description         |
| ------------ | ----------------- | -------- | ------------------- |
| `id`         | integer \| string | Yes      | Musician identifier |
| `name`       | string            | Yes      | Full name           |
| `instrument` | string            | Yes      | Primary instrument  |

#### `InputListInput`

A simplified input for venue consumption. Omits internal IDs for linked inputs and gear preference trees — just the essentials a sound engineer needs.

```jsonc
{
	"id": "input-1",
	"name": "Gtr Amp",
	"short_name": "Gtr",
	"color": "blue",
	"stand": "short_boom",
	"phantom_power": false
}
```

| Field           | Type    | Required | Description                                           |
| --------------- | ------- | -------- | ----------------------------------------------------- |
| `id`            | string  | Yes      | Input identifier                                      |
| `name`          | string  | Yes      | Full input name                                       |
| `short_name`    | string  | No       | Abbreviated name                                      |
| `color`         | string  | No       | Color code                                            |
| `stand`         | string  | No       | `"none"`, `"short_boom"`, `"tall_boom"`, `"straight"` |
| `phantom_power` | boolean | No       | 48V phantom power required                            |

#### `InputListOutput`

```jsonc
{ "id": "output-1", "name": "Wedge 1", "type": "wedge" }
```

| Field  | Type   | Required | Description                                                    |
| ------ | ------ | -------- | -------------------------------------------------------------- |
| `id`   | string | Yes      | Output identifier                                              |
| `name` | string | Yes      | Output name                                                    |
| `type` | string | No       | `"wedge"`, `"iem_stereo"`, `"iem_mono"`, `"sidefill"`, `"sub"` |

#### `InputListContact`

```jsonc
{
	"name": "Jordan Hayes",
	"role": "Front of House Engineer",
	"phone": "+1-555-0102",
	"email": "jordan@example.com"
}
```

| Field   | Type   | Required | Description   |
| ------- | ------ | -------- | ------------- |
| `name`  | string | Yes      | Full name     |
| `role`  | string | No       | Role          |
| `phone` | string | No       | Phone number  |
| `email` | string | No       | Email address |

### What's Excluded

The `.inputlist` intentionally omits internal band data that a venue doesn't need:

- **Monitor mixes** — internal to the band; communicated verbally at soundcheck
- **Gear preferences** (preferred/allowed/disallowed trees) — already resolved before the gig
- **Player→Item associations** — venues care about what's on stage, not who owns what
- **Band ID / internal IDs** — `source_band_id` in metadata is enough for traceability
- **Undo history / app state** — never persisted

---

## 4. Versioning Strategy

### Format Version

Each file carries a single `format_version` field using [semver](https://semver.org/):

```
format_version: "MAJOR.MINOR.PATCH"
```

This version pins the structure of the entire file — there are no separate per-entity schema versions in the file format. The entity schemas in `ref/stageplot/specs/` inform the design but are not referenced at runtime.

### Version Bump Rules

| Change                                      | Bump  | Reader Behavior                                                                   |
| ------------------------------------------- | ----- | --------------------------------------------------------------------------------- |
| New **optional** field added                | MINOR | Old readers ignore unknown fields; new readers supply defaults for missing fields |
| Field **renamed** or **removed**            | MAJOR | Importer detects and runs migration, or rejects with clear error                  |
| **Structural** change (e.g. array → object) | MAJOR | Migration required                                                                |
| Bug fix in spec (no field changes)          | PATCH | No reader changes needed                                                          |

### Migration Pattern

File format migrations follow the same pattern as `packages/db/src/migrations/runner.ts`:

```typescript
interface FileFormatMigration {
  from: string;  // semver the migration applies to
  to: string;    // semver after migration
  migrate: (data: unknown) => unknown;
}

const migrations: FileFormatMigration[] = [
  // Example: v1 → v2 migration
  {
    from: "1.x.x",
    to: "2.0.0",
    migrate: (data) => {
      // Transform data structure
      return { ...data, format_version: "2.0.0", /* ...changes */ };
    }
  }
];
```

The importer:

1. Reads `format_version` from the file
2. If it matches the current version, proceeds directly
3. If it's older, runs migrations in sequence until current
4. If the major version is newer than supported, rejects with an error telling the user to update StagePlotter

---

## 5. ID Strategy

### File Format IDs

All IDs in the file format are **strings**. This allows flexibility for UUID, prefixed, or human-readable identifiers.

### Export (SQLite → File)

On export, integer primary keys from SQLite are converted to prefixed strings:

| SQLite Table             | File ID Format | Example           |
| ------------------------ | -------------- | ----------------- |
| `bands.id` (TEXT)        | Pass through   | `"b-550e8400..."` |
| `stage_plots.id` (TEXT)  | Prefixed       | `"plot-abc123"`   |
| `items.id` (INTEGER)     | Prefixed       | `"item-7"`        |
| `musicians.id` (INTEGER) | Prefixed       | `"musician-3"`    |
| `persons.id` (INTEGER)   | Prefixed       | `"person-5"`      |

### Import (File → SQLite)

On import:

1. **New local IDs** are generated for all entities (auto-increment integers or new UUIDs as appropriate for the table)
2. A **mapping table** is maintained during import (`{ "item-7": 12 }`) to resolve cross-references within the file
3. The original file ID is stored in a `source_id` column (if available) for traceability
4. **Duplicate detection** uses content hashing (name + category + key attributes), not ID comparison — two files from different exports of the same band should merge cleanly

### Cross-References

Within a file, references between entities use the file-format string IDs:

- `player.item_ids` → references `band.items[].id`
- `player.output_ids` → references `band.outputs[].id`
- `input.channel_id` → references `band.channels[].id`
- `input.linked_to` → references another `band.inputs[].id`
- `monitor_mix.player_id` → references `band.players[].id`
- `monitor_mix.mix[].input_id` → references `band.inputs[].id`
- `placed_item.item_id` → references `band.items[].id`
- `placed_item.player_id` → references `band.players[].id`

---

## 6. Round-Trip Fidelity Requirements

A save → close → open cycle must produce identical application state. Specifically:

| Requirement                                   | Detail                                                                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Every SQLite column maps to a file field**  | No column is silently dropped on export                                                                                                                                       |
| **`item_data` JSON blobs preserved verbatim** | The `catalog_snapshot` / `itemData` field is the exact JSON blob from the `items.item_data` column, not re-serialized or transformed                                          |
| **`sort_order` preserved**                    | Array ordering in `placed_items` is authoritative. The `sort_order` field is also stored explicitly for redundancy.                                                           |
| **Float positions preserved**                 | `pos_x`, `pos_y`, `width`, `height` are stored as JSON numbers with no rounding applied                                                                                       |
| **Null vs. absent vs. empty string**          | `null` means "explicitly unset", absent means "not provided / use default", `""` (empty string) means "user cleared this field". Importers must distinguish all three.        |
| **Canvas/stage dimensions**                   | Preserved exactly. On import, if dimensions differ from the current standard, the importer should use the file's values (not force the current standard).                     |
| **Timestamps**                                | `created_at` / `modified_at` in file metadata reflect file operations, not entity timestamps. Entity-level `created_at` / `updated_at` from SQLite are regenerated on import. |

---

## 7. Future Extensibility

### Custom Items (Phase 2)

When custom items ship, the `.stageplot` format upgrades from plain JSON to a **ZIP container**:

```
my-band.stageplot (ZIP)
├── manifest.json          ← same JSON structure as Phase 1
└── assets/
    ├── custom-item-1.svg
    └── custom-item-2.png
```

- `catalog_snapshot` entries for custom items reference paths relative to `assets/` (e.g. `"src": "assets/custom-item-1.svg"`)
- Detection: check file magic bytes — `{` (0x7B) = JSON, `PK` (0x50 0x4B) = ZIP
- The `.inputlist` format stays plain JSON always. Custom item images are rasterized/inlined as data URIs or omitted.

### Templates

A new document type for reusable stage layouts:

```jsonc
{
	"format_version": "1.1.0",
	"type": "template"
	// ... subset of stageplot structure without band-specific data
}
```

Added via minor version bump — existing readers ignore the unknown `type`.

### Festival Scheduling

Multi-band scheduling data can be added as a new top-level field:

```jsonc
{
	"format_version": "1.2.0",
	"type": "band_project",
	"schedule": {
		/* ... */
	}
	// ... existing fields unchanged
}
```

Minor version bump — `schedule` is optional and ignored by older readers.

### Console Scene Export

A separate format (`.console-scene` or similar) generated FROM `.stageplot` data, containing channel assignments in a format compatible with digital mixing consoles. This would be its own specification, not an extension of the existing formats.

---

## 8. Full Examples

### Complete `.stageplot` Example

```json
{
	"$schema": "https://stageplotter.com/schemas/stageplot-1.0.0.json",
	"format_version": "1.0.0",
	"type": "band_project",

	"file_metadata": {
		"created_at": "2025-02-07T14:30:00Z",
		"modified_at": "2025-02-07T15:45:00Z",
		"created_by": {
			"app": "StagePlotter",
			"version": "0.1.0",
			"platform": "web"
		}
	},

	"band": {
		"id": "b-550e8400-e29b-41d4-a716-446655440000",
		"name": "The Stageplotters",

		"players": [
			{
				"id": "player-1",
				"person": {
					"name": "Alex Rivera",
					"pronouns": "they/them",
					"phone": "+1-555-0101",
					"email": "alex@stageplotters.com"
				},
				"item_ids": ["item-1", "item-2"],
				"output_ids": ["output-1"]
			},
			{
				"id": "player-2",
				"person": {
					"name": "Sam Chen",
					"pronouns": "he/him"
				},
				"item_ids": ["item-3", "item-4", "item-5"],
				"output_ids": ["output-2"]
			},
			{
				"id": "player-3",
				"person": {
					"name": "Maya Johnson",
					"pronouns": "she/her"
				},
				"item_ids": ["item-6"],
				"output_ids": ["output-3"]
			}
		],

		"contacts": [
			{
				"name": "Jordan Hayes",
				"role": "Front of House Engineer",
				"pronouns": "she/her",
				"phone": "+1-555-0102",
				"email": "jordan@stageplotters.com"
			},
			{
				"name": "Casey Park",
				"role": "Tour Manager",
				"phone": "+1-555-0103",
				"email": "casey@stageplotters.com"
			}
		],

		"items": [
			{
				"id": "item-1",
				"name": "Fender Deluxe Reverb",
				"category": "amps",
				"provision": "artist_provided",
				"backline_request": {
					"preferred": [
						{
							"id": "gear-1",
							"name": "Deluxe Reverb",
							"brand": "Fender",
							"model": "Deluxe Reverb",
							"version": "'65 Reissue"
						}
					],
					"allowed": [
						{ "id": "gear-2", "name": "Twin Reverb", "brand": "Fender", "model": "Twin Reverb" },
						{ "id": "gear-3", "name": "AC30", "brand": "Vox", "model": "AC30" }
					],
					"disallowed": []
				},
				"input_ids": ["input-1"],
				"catalog_snapshot": {
					"type": "egt",
					"category": "amps",
					"variants": {
						"default": { "src": "img/egt/amp-fender-deluxe.svg", "width": 57, "height": 43 }
					}
				}
			},
			{
				"id": "item-2",
				"name": "Fender Stratocaster",
				"category": "guitars",
				"provision": "artist_provided",
				"input_ids": [],
				"catalog_snapshot": {
					"type": "egt",
					"category": "guitars",
					"variants": {
						"default": { "src": "img/egt/guitar-strat.svg", "width": 25, "height": 80 }
					}
				}
			},
			{
				"id": "item-3",
				"name": "Kick Drum",
				"category": "drums",
				"provision": "venue_provided",
				"input_ids": ["input-2", "input-3"],
				"catalog_snapshot": {
					"type": "drum",
					"category": "drums",
					"variants": {
						"default": { "src": "img/drum/kick.svg", "width": 60, "height": 60 }
					}
				}
			},
			{
				"id": "item-4",
				"name": "Snare Drum",
				"category": "drums",
				"provision": "venue_provided",
				"input_ids": ["input-4", "input-5"],
				"catalog_snapshot": {
					"type": "drum",
					"category": "drums",
					"variants": {
						"default": { "src": "img/drum/snare.svg", "width": 35, "height": 35 }
					}
				}
			},
			{
				"id": "item-5",
				"name": "Hi-Hat",
				"category": "drums",
				"provision": "venue_provided",
				"input_ids": ["input-6"],
				"catalog_snapshot": {
					"type": "drum",
					"category": "drums",
					"variants": {
						"default": { "src": "img/drum/hihat.svg", "width": 30, "height": 30 }
					}
				}
			},
			{
				"id": "item-6",
				"name": "Bass DI",
				"category": "di",
				"provision": "venue_provided",
				"input_ids": ["input-7"],
				"catalog_snapshot": {
					"type": "di",
					"category": "di",
					"variants": {
						"default": { "src": "img/di/di-box.svg", "width": 20, "height": 15 }
					}
				}
			}
		],

		"inputs": [
			{
				"id": "input-1",
				"name": "Guitar Amp",
				"short_name": "Gtr",
				"color": "blue",
				"channel_id": "ch-1",
				"stand": "short_boom",
				"phantom_power": false
			},
			{
				"id": "input-2",
				"name": "Kick In",
				"short_name": "KkIn",
				"channel_id": "ch-2",
				"stand": "short_boom",
				"phantom_power": false
			},
			{
				"id": "input-3",
				"name": "Kick Out",
				"short_name": "KkOut",
				"channel_id": "ch-3",
				"stand": "short_boom",
				"phantom_power": false
			},
			{
				"id": "input-4",
				"name": "Snare Top",
				"short_name": "SnT",
				"channel_id": "ch-4",
				"stand": "none",
				"phantom_power": false
			},
			{
				"id": "input-5",
				"name": "Snare Bottom",
				"short_name": "SnB",
				"channel_id": "ch-5",
				"stand": "none",
				"phantom_power": true
			},
			{
				"id": "input-6",
				"name": "Hi-Hat",
				"short_name": "HH",
				"channel_id": "ch-6",
				"stand": "none",
				"phantom_power": true
			},
			{
				"id": "input-7",
				"name": "Bass DI",
				"short_name": "Bs",
				"color": "green",
				"channel_id": "ch-7",
				"stand": "none",
				"phantom_power": false
			}
		],

		"channels": [
			{ "id": "ch-1", "number": 1, "name": "Guitar Amp", "short_name": "Gtr" },
			{ "id": "ch-2", "number": 2, "name": "Kick In", "short_name": "KkIn" },
			{ "id": "ch-3", "number": 3, "name": "Kick Out", "short_name": "KkOut" },
			{ "id": "ch-4", "number": 4, "name": "Snare Top", "short_name": "SnT" },
			{ "id": "ch-5", "number": 5, "name": "Snare Bottom", "short_name": "SnB" },
			{ "id": "ch-6", "number": 6, "name": "Hi-Hat", "short_name": "HH" },
			{ "id": "ch-7", "number": 7, "name": "Bass DI", "short_name": "Bs" }
		],

		"outputs": [
			{ "id": "output-1", "name": "Guitar Wedge", "type": "wedge" },
			{ "id": "output-2", "name": "Drum Fill", "type": "wedge" },
			{ "id": "output-3", "name": "Bass IEM", "type": "iem_stereo" }
		],

		"monitor_mixes": [
			{
				"id": "mix-1",
				"player_id": "player-1",
				"mix": [
					{ "input_id": "input-1", "level": "lead" },
					{ "input_id": "input-2", "level": "medium" },
					{ "input_id": "input-4", "level": "medium" },
					{ "input_id": "input-7", "level": "low" }
				]
			},
			{
				"id": "mix-2",
				"player_id": "player-2",
				"mix": [
					{ "input_id": "input-2", "level": "high" },
					{ "input_id": "input-4", "level": "high" },
					{ "input_id": "input-6", "level": "high" },
					{ "input_id": "input-1", "level": "medium" },
					{ "input_id": "input-7", "level": "medium" }
				]
			}
		]
	},

	"plots": [
		{
			"id": "plot-1",
			"plot_name": "Standard Club Setup",
			"revision_date": "2025-02-07",
			"is_default": true,

			"canvas": {
				"format": "letter",
				"orientation": "landscape",
				"dpi": 96,
				"width": 1100,
				"height": 850
			},

			"stage": {
				"x": 50,
				"y": 50,
				"width": 1000,
				"height": 700,
				"margins": { "top": 50, "right": 50, "bottom": 100, "left": 50 }
			},

			"placed_items": [
				{
					"item_id": "item-1",
					"current_variant": "default",
					"position": {
						"x": 200.0,
						"y": 400.0,
						"width": 57.0,
						"height": 43.0,
						"zone": "DSL",
						"relativeX": -300.0,
						"relativeY": 350.0
					},
					"rotation": 0,
					"sort_order": 0,
					"player_id": "player-1"
				},
				{
					"item_id": "item-2",
					"current_variant": "default",
					"position": {
						"x": 180.0,
						"y": 450.0,
						"width": 25.0,
						"height": 80.0,
						"zone": "DSL",
						"relativeX": -320.0,
						"relativeY": 400.0
					},
					"rotation": 0,
					"sort_order": 1,
					"player_id": "player-1"
				},
				{
					"item_id": "item-3",
					"current_variant": "default",
					"position": {
						"x": 520.0,
						"y": 200.0,
						"width": 60.0,
						"height": 60.0,
						"zone": "USC",
						"relativeX": 0.0,
						"relativeY": 150.0
					},
					"rotation": 0,
					"sort_order": 2,
					"player_id": "player-2"
				},
				{
					"item_id": "item-4",
					"current_variant": "default",
					"position": {
						"x": 500.0,
						"y": 260.0,
						"width": 35.0,
						"height": 35.0,
						"zone": "USC",
						"relativeX": -20.0,
						"relativeY": 210.0
					},
					"rotation": 0,
					"sort_order": 3,
					"player_id": "player-2"
				},
				{
					"item_id": "item-5",
					"current_variant": "default",
					"position": {
						"x": 470.0,
						"y": 240.0,
						"width": 30.0,
						"height": 30.0,
						"zone": "USC",
						"relativeX": -50.0,
						"relativeY": 190.0
					},
					"rotation": 0,
					"sort_order": 4,
					"player_id": "player-2"
				},
				{
					"item_id": "item-6",
					"current_variant": "default",
					"position": {
						"x": 800.0,
						"y": 420.0,
						"width": 20.0,
						"height": 15.0,
						"zone": "DSR",
						"relativeX": 280.0,
						"relativeY": 370.0
					},
					"rotation": 0,
					"sort_order": 5,
					"player_id": "player-3"
				}
			],

			"event": {
				"name": "Friday Night Live",
				"date": "2025-03-15",
				"time": "20:00",
				"venue": "The Blue Note"
			},

			"metadata": {}
		}
	]
}
```

### Complete `.inputlist` Example

```json
{
	"$schema": "https://stageplotter.com/schemas/inputlist-1.0.0.json",
	"format_version": "1.0.0",
	"type": "input_list",

	"file_metadata": {
		"created_at": "2025-02-07T16:00:00Z",
		"created_by": {
			"app": "StagePlotter",
			"version": "0.1.0",
			"platform": "web"
		},
		"source_band": "The Stageplotters",
		"source_band_id": "b-550e8400-e29b-41d4-a716-446655440000"
	},

	"plot_name": "Standard Club Setup",
	"revision_date": "2025-02-07",

	"canvas": {
		"format": "letter",
		"orientation": "landscape",
		"dpi": 96,
		"width": 1100,
		"height": 850
	},

	"stage": {
		"x": 50,
		"y": 50,
		"width": 1000,
		"height": 700,
		"margins": { "top": 50, "right": 50, "bottom": 100, "left": 50 }
	},

	"items": [
		{
			"id": "item-1",
			"name": "Fender Deluxe Reverb",
			"type": "egt",
			"category": "amps",
			"currentVariant": "default",
			"position": {
				"x": 200.0,
				"y": 400.0,
				"width": 57.0,
				"height": 43.0,
				"zone": "DSL",
				"relativeX": -300.0,
				"relativeY": 350.0
			},
			"channel": "1",
			"musician": "Alex Rivera",
			"itemData": {
				"type": "egt",
				"category": "amps",
				"variants": {
					"default": { "src": "img/egt/amp-fender-deluxe.svg", "width": 57, "height": 43 }
				}
			}
		},
		{
			"id": "item-2",
			"name": "Fender Stratocaster",
			"type": "egt",
			"category": "guitars",
			"currentVariant": "default",
			"position": {
				"x": 180.0,
				"y": 450.0,
				"width": 25.0,
				"height": 80.0,
				"zone": "DSL",
				"relativeX": -320.0,
				"relativeY": 400.0
			},
			"channel": "",
			"musician": "Alex Rivera",
			"itemData": {
				"type": "egt",
				"category": "guitars",
				"variants": {
					"default": { "src": "img/egt/guitar-strat.svg", "width": 25, "height": 80 }
				}
			}
		},
		{
			"id": "item-3",
			"name": "Kick Drum",
			"type": "drum",
			"category": "drums",
			"currentVariant": "default",
			"position": {
				"x": 520.0,
				"y": 200.0,
				"width": 60.0,
				"height": 60.0,
				"zone": "USC",
				"relativeX": 0.0,
				"relativeY": 150.0
			},
			"channel": "2",
			"musician": "Sam Chen",
			"itemData": {
				"type": "drum",
				"category": "drums",
				"variants": {
					"default": { "src": "img/drum/kick.svg", "width": 60, "height": 60 }
				}
			}
		},
		{
			"id": "item-4",
			"name": "Snare Drum",
			"type": "drum",
			"category": "drums",
			"currentVariant": "default",
			"position": {
				"x": 500.0,
				"y": 260.0,
				"width": 35.0,
				"height": 35.0,
				"zone": "USC",
				"relativeX": -20.0,
				"relativeY": 210.0
			},
			"channel": "4",
			"musician": "Sam Chen",
			"itemData": {
				"type": "drum",
				"category": "drums",
				"variants": {
					"default": { "src": "img/drum/snare.svg", "width": 35, "height": 35 }
				}
			}
		},
		{
			"id": "item-5",
			"name": "Hi-Hat",
			"type": "drum",
			"category": "drums",
			"currentVariant": "default",
			"position": {
				"x": 470.0,
				"y": 240.0,
				"width": 30.0,
				"height": 30.0,
				"zone": "USC",
				"relativeX": -50.0,
				"relativeY": 190.0
			},
			"channel": "6",
			"musician": "Sam Chen",
			"itemData": {
				"type": "drum",
				"category": "drums",
				"variants": {
					"default": { "src": "img/drum/hihat.svg", "width": 30, "height": 30 }
				}
			}
		},
		{
			"id": "item-6",
			"name": "Bass DI",
			"type": "di",
			"category": "di",
			"currentVariant": "default",
			"position": {
				"x": 800.0,
				"y": 420.0,
				"width": 20.0,
				"height": 15.0,
				"zone": "DSR",
				"relativeX": 280.0,
				"relativeY": 370.0
			},
			"channel": "7",
			"musician": "Maya Johnson",
			"itemData": {
				"type": "di",
				"category": "di",
				"variants": {
					"default": { "src": "img/di/di-box.svg", "width": 20, "height": 15 }
				}
			}
		}
	],

	"musicians": [
		{ "id": 1, "name": "Alex Rivera", "instrument": "Guitar" },
		{ "id": 2, "name": "Sam Chen", "instrument": "Drums" },
		{ "id": 3, "name": "Maya Johnson", "instrument": "Bass" }
	],

	"inputs": [
		{
			"id": "input-1",
			"name": "Guitar Amp",
			"short_name": "Gtr",
			"color": "blue",
			"stand": "short_boom",
			"phantom_power": false
		},
		{
			"id": "input-2",
			"name": "Kick In",
			"short_name": "KkIn",
			"stand": "short_boom",
			"phantom_power": false
		},
		{
			"id": "input-3",
			"name": "Kick Out",
			"short_name": "KkOut",
			"stand": "short_boom",
			"phantom_power": false
		},
		{
			"id": "input-4",
			"name": "Snare Top",
			"short_name": "SnT",
			"stand": "none",
			"phantom_power": false
		},
		{
			"id": "input-5",
			"name": "Snare Bottom",
			"short_name": "SnB",
			"stand": "none",
			"phantom_power": true
		},
		{
			"id": "input-6",
			"name": "Hi-Hat",
			"short_name": "HH",
			"stand": "none",
			"phantom_power": true
		},
		{
			"id": "input-7",
			"name": "Bass DI",
			"short_name": "Bs",
			"color": "green",
			"stand": "none",
			"phantom_power": false
		}
	],

	"outputs": [
		{ "id": "output-1", "name": "Guitar Wedge", "type": "wedge" },
		{ "id": "output-2", "name": "Drum Fill", "type": "wedge" },
		{ "id": "output-3", "name": "Bass IEM", "type": "iem_stereo" }
	],

	"contacts": [
		{
			"name": "Jordan Hayes",
			"role": "Front of House Engineer",
			"phone": "+1-555-0102",
			"email": "jordan@stageplotters.com"
		},
		{
			"name": "Casey Park",
			"role": "Tour Manager",
			"phone": "+1-555-0103",
			"email": "casey@stageplotters.com"
		}
	],

	"event": {
		"name": "Friday Night Live",
		"date": "2025-03-15",
		"time": "20:00",
		"venue": "The Blue Note"
	},

	"metadata": {
		"exportedAt": "2025-02-07T16:00:00Z",
		"exportedBy": "StagePlotter v0.1.0"
	}
}
```

---

## 9. Tauri File Association Config

Add to `app/desktop/src-tauri/tauri.conf.json` under `bundle`:

```json
{
	"bundle": {
		"fileAssociations": [
			{
				"ext": ["stageplot"],
				"mimeType": "application/vnd.stageplotter.project+json",
				"description": "StagePlotter Band Project",
				"role": "Editor"
			},
			{
				"ext": ["inputlist"],
				"mimeType": "application/vnd.stageplotter.inputlist+json",
				"description": "StagePlotter Input List",
				"role": "Viewer"
			}
		]
	}
}
```

This registers `.stageplot` files as editable by StagePlotter (double-click to open) and `.inputlist` files as viewable (StagePlotter can display them but they are export-only — you don't save back to `.inputlist`).

---

## Appendix: Entity Coverage Cross-Reference

Verification that both file formats cover all entities from [DATA_MODEL.md](./DATA_MODEL.md):

| DATA_MODEL Entity | `.stageplot` Location                                         | `.inputlist` Location       | Notes                                |
| ----------------- | ------------------------------------------------------------- | --------------------------- | ------------------------------------ |
| Band              | `band` (root)                                                 | `file_metadata.source_band` | Input list only carries band name    |
| Person            | `band.players[].person`, `band.contacts[]`                    | `contacts[]`                | Flattened in input list              |
| Player            | `band.players[]`                                              | `musicians[]`               | Simplified to name + instrument      |
| Item (Instrument) | `band.items[]`                                                | `items[]`                   | Flattened with position inlined      |
| Input             | `band.inputs[]`                                               | `inputs[]`                  | Simplified (no gear prefs)           |
| Channel           | `band.channels[]`                                             | —                           | Internal; not needed by venues       |
| Output            | `band.outputs[]`                                              | `outputs[]`                 | Same shape                           |
| MonitorMix        | `band.monitor_mixes[]`                                        | —                           | Internal; communicated at soundcheck |
| Gear              | `band.items[].backline_request.*[]`                           | —                           | Resolved before sharing              |
| GearPreference    | `band.items[].backline_request`, `band.inputs[].ideal_device` | —                           | Resolved before sharing              |

### SQLite Column Coverage

| SQLite Table.Column         | `.stageplot` Field                                                             |
| --------------------------- | ------------------------------------------------------------------------------ |
| `bands.id`                  | `band.id`                                                                      |
| `bands.name`                | `band.name`                                                                    |
| `bands.created_at`          | `file_metadata.created_at` (file-level)                                        |
| `bands.updated_at`          | `file_metadata.modified_at` (file-level)                                       |
| `stage_plots.id`            | `plots[].id`                                                                   |
| `stage_plots.name`          | `plots[].plot_name`                                                            |
| `stage_plots.band_id`       | Implicit (nested under `band`)                                                 |
| `stage_plots.revision_date` | `plots[].revision_date`                                                        |
| `stage_plots.canvas_width`  | `plots[].canvas.width`                                                         |
| `stage_plots.canvas_height` | `plots[].canvas.height`                                                        |
| `stage_plots.metadata`      | `plots[].metadata`                                                             |
| `stage_plots.event_name`    | `plots[].event.name`                                                           |
| `stage_plots.event_date`    | `plots[].event.date`                                                           |
| `stage_plots.event_time`    | `plots[].event.time`                                                           |
| `stage_plots.venue`         | `plots[].event.venue`                                                          |
| `stage_plots.created_at`    | Regenerated on import                                                          |
| `stage_plots.updated_at`    | Regenerated on import                                                          |
| `items.id`                  | `band.items[].id` / `plots[].placed_items[].item_id`                           |
| `items.plot_id`             | Implicit (placed_items nested under plot)                                      |
| `items.name`                | `band.items[].name`                                                            |
| `items.type`                | `band.items[].catalog_snapshot.type`                                           |
| `items.category`            | `band.items[].category`                                                        |
| `items.current_variant`     | `plots[].placed_items[].current_variant`                                       |
| `items.pos_x`               | `plots[].placed_items[].position.x`                                            |
| `items.pos_y`               | `plots[].placed_items[].position.y`                                            |
| `items.width`               | `plots[].placed_items[].position.width`                                        |
| `items.height`              | `plots[].placed_items[].position.height`                                       |
| `items.channel`             | Derived from `band.inputs[].channel_id` → `band.channels[].number`             |
| `items.musician`            | Derived from `plots[].placed_items[].player_id` → `band.players[].person.name` |
| `items.item_data`           | `band.items[].catalog_snapshot`                                                |
| `items.sort_order`          | `plots[].placed_items[].sort_order` + array ordering                           |
| `musicians.id`              | `band.players[].id`                                                            |
| `musicians.plot_id`         | Implicit (band owns players)                                                   |
| `musicians.name`            | `band.players[].person.name`                                                   |
| `musicians.instrument`      | Derived from `band.players[].item_ids`                                         |
| `persons.id`                | Inline in `band.players[].person` or `band.contacts[]`                         |
| `persons.band_id`           | Implicit (nested under `band`)                                                 |
| `persons.musician_id`       | Implicit (person is inline in player)                                          |
| `persons.name`              | `band.players[].person.name` / `band.contacts[].name`                          |
| `persons.role`              | `band.contacts[].role`                                                         |
| `persons.pronouns`          | `*.person.pronouns`                                                            |
| `persons.phone`             | `*.person.phone`                                                               |
| `persons.email`             | `*.person.email`                                                               |
| `persons.member_type`       | Not in file format (app-internal metadata)                                     |
| `persons.status`            | Not in file format (app-internal metadata)                                     |

### Backward Compatibility with `StagePlotExport`

The `.inputlist` format preserves the shape of the existing `StagePlotExport` type from `ImportExport.svelte`:

| `StagePlotExport` Field | `.inputlist` Field   | Change                                   |
| ----------------------- | -------------------- | ---------------------------------------- |
| `version`               | `format_version`     | Renamed (old field accepted on import)   |
| `type: "stage_plot"`    | `type: "input_list"` | New value (old value accepted on import) |
| `plot_name`             | `plot_name`          | Unchanged                                |
| `revision_date`         | `revision_date`      | Unchanged                                |
| `canvas`                | `canvas`             | Unchanged shape                          |
| `items[]`               | `items[]`            | Same shape, additional optional fields   |
| `musicians[]`           | `musicians[]`        | Unchanged                                |
| `metadata`              | `metadata`           | Unchanged                                |
| —                       | `stage`              | New (optional)                           |
| —                       | `inputs[]`           | New (optional)                           |
| —                       | `outputs[]`          | New (optional)                           |
| —                       | `contacts[]`         | New (optional)                           |
| —                       | `event`              | New (optional)                           |
| —                       | `file_metadata`      | New (optional)                           |
| —                       | `$schema`            | New (optional)                           |
