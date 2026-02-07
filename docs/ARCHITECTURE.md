# StagePlotter Architecture

## Overview

StagePlotter is a monorepo shipping two targets from a single codebase:

- **PWA** (`app.stageplotter.ca`) — Offline-first web app with SQLite OPFS persistence
- **Desktop** (`StagePlotter.app`) — Tauri desktop app with native SQLite

A separate **marketing site** (`stageplotter.ca`) lives in the `marketing/` workspace.

## Directory Layout

```
stageplotter/
├── app/                  # PWA app (SvelteKit)
│   ├── src/              # Application source
│   ├── static/           # Static assets (equipment images, specs)
│   ├── desktop/          # Tauri desktop wrapper
│   ├── scripts/          # Build scripts (prepare-tauri, etc.)
│   └── e2e/              # Playwright E2E tests
├── marketing/            # Marketing site (standalone)
├── packages/
│   ├── db/               # @stageplotter/db — database adapters
│   └── shared/           # @stageplotter/shared — types & constants
└── docs/                 # Project documentation
```

## Database Architecture

SQLite everywhere, with a shared `DbAdapter` interface:

| Platform  | Adapter             | Storage                                  |
| --------- | ------------------- | ---------------------------------------- |
| PWA       | `adapter-opfs.ts`   | SQLite WASM + OPFS (Web Worker)          |
| Desktop   | `adapter-tauri.ts`  | `@tauri-apps/plugin-sql` (native SQLite) |
| Tests/SSR | `adapter-memory.ts` | In-memory (no persistence)               |

Platform detection in `app/src/lib/platform.ts` enables dynamic import of the correct adapter.

## Build Targets

| Target    | Adapter                | Command                   |
| --------- | ---------------------- | ------------------------- |
| PWA       | `adapter-cloudflare`   | `bun run build`           |
| Desktop   | `adapter-static` (SPA) | `bun run build:desktop`   |
| Marketing | `adapter-cloudflare`   | `bun run build:marketing` |

The `app/scripts/prepare-tauri.ts` script copies `app/src/` and `app/static/` into `app/desktop/`,
stripping server-only files, before Tauri builds.

## Canvas System

- **Canvas**: Letter size landscape (1056×816px @ 96 DPI, displayed at 1100×850)
- **Stage**: Performance area with configurable margins
- **Scale**: 2.327 pixels per inch (based on Fender Deluxe Reverb reference)
- **Zones**: 6-zone grid (DSR, DSC, DSL, USR, USC, USL)

See `docs/canvas-architecture.md` and `docs/scale-system.md` for details.

## Key Technologies

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`)
- **SvelteKit 2** for routing and SSR/SSG
- **Tailwind CSS 4** with custom theme tokens
- **Bits UI** for headless accessible components
- **Selecto** for multi-selection on the canvas
- **Runed** for reactive utilities (StateHistory, PressedKeys)
- **SQLite WASM** + OPFS for client-side persistence
- **Tauri v2** for the desktop app
