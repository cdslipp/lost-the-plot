# Lost the Plot

Stage plot creator for live music. Drag-and-drop canvas editor for planning stage layouts, equipment placement, and input lists.

Everything runs locally in the browser — no accounts, no cloud.

## Try it

**Web app**: [losttheplot.app](https://losttheplot.app)

## Run locally

```bash
bun install
bun run dev
```

## What it does

- Drag-and-drop canvas editor
- 500+ equipment assets (mics, drums, amps, keyboards, monitors, etc.)
- Patch list with channel assignments
- Band and musician management
- Import/export as JSON
- Offline-first with local SQLite storage
- Dark mode

## Tech

Svelte 5, SvelteKit, Tailwind CSS 4, SQLite WASM + OPFS, Tauri v2 (desktop), Cloudflare Pages.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
