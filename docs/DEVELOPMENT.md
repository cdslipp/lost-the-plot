# Development Setup

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Rust](https://rustup.rs/) (for desktop builds only)

## Quick Start

```bash
# Install dependencies (links all workspace packages)
bun install

# Start the PWA dev server
bun run dev

# Start the marketing site dev server
bun run dev:marketing
```

## Workspace Commands

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `bun run dev`             | Start PWA dev server             |
| `bun run dev:marketing`   | Start marketing site dev server  |
| `bun run dev:desktop`     | Start Tauri desktop dev          |
| `bun run build`           | Build PWA for Cloudflare Pages   |
| `bun run build:marketing` | Build marketing site             |
| `bun run build:desktop`   | Build Tauri desktop app          |
| `bun run check`           | Run TypeScript checking          |
| `bun run lint`            | Run Prettier + ESLint            |
| `bun run format`          | Auto-format all files            |
| `bun run test`            | Run unit + E2E tests (from app/) |

## Workspace Packages

- `packages/db` — Database adapter interface and implementations
- `packages/shared` — Shared TypeScript types and constants

Import from workspace packages:

```ts
import type { DbAdapter } from '@stageplotter/db';
import type { StagePlot } from '@stageplotter/shared';
```

## Desktop Development

Desktop builds require Rust and the Tauri CLI:

```bash
# Install Tauri CLI
cargo install tauri-cli

# Start desktop dev (copies app/src/ → app/desktop/src/ first)
bun run dev:desktop
```

## COOP/COEP Headers

The PWA requires `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` headers for SharedArrayBuffer
support (needed by SQLite OPFS). These are set in:

- `app/src/hooks.server.ts` (SvelteKit server)
- `app/vite.config.ts` (dev server)
