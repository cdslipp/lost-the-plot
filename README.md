# StagePlotter

Professional stage plot creator for live music. Plan your stage layout, equipment placement, and input list with a drag-and-drop canvas editor.

**PWA**: [app.stageplotter.ca](https://app.stageplotter.ca) | **Desktop**: Coming soon

## Features

- Drag-and-drop canvas editor (1100×850px, letter landscape)
- 500+ equipment assets (mics, drums, guitars, amps, keyboards, monitors, etc.)
- Multi-selection with Selecto (click, shift-click, box select)
- Patch list with channel assignment (inputs and outputs)
- Musician management and assignment
- Dark/light mode with consistent theming
- Import/export JSON stage plots
- Undo/redo with keyboard shortcuts
- Offline-first with SQLite OPFS persistence
- Stage builder (create rectangular stages from deck sections)
- Context menu (edit, duplicate, delete)
- Keyboard shortcuts (arrows to nudge, ⌘K to search, ⌘Z/Y undo/redo)

## Quick Start

```bash
bun install
bun run dev
```

## Architecture

This is a monorepo shipping as both a PWA and a Tauri desktop app:

| Target    | URL                   | Build                     |
| --------- | --------------------- | ------------------------- |
| PWA       | `app.stageplotter.ca` | `bun run build`           |
| Desktop   | —                     | `bun run build:desktop`   |
| Marketing | `stageplotter.ca`     | `bun run build:marketing` |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture guide.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design and directory layout
- [Development](docs/DEVELOPMENT.md) — Dev setup and workspace commands
- [Deployment](docs/DEPLOYMENT.md) — Cloudflare Pages and Tauri distribution
- [Contributing](docs/CONTRIBUTING.md) — How to contribute
- [Canvas Architecture](docs/canvas-architecture.md) — Canvas and stage coordinate system
- [Scale System](docs/scale-system.md) — Real-world measurement scale
- [Data Model](docs/DATA_MODEL.md) — Entity relationships and JSON schemas
- [Import/Export](docs/import-export.md) — JSON file format specification

## Tech Stack

- **Svelte 5** + **SvelteKit 2** — Framework
- **Tailwind CSS 4** — Styling
- **Bits UI** — Headless accessible components
- **SQLite WASM** + OPFS — Client-side persistence (PWA)
- **Tauri v2** — Desktop app
- **Cloudflare Pages** — PWA and marketing deployment

## License

AGPL-3.0-only. See [LICENSE](LICENSE) for details.
