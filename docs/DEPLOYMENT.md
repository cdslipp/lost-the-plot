# Deployment

## PWA (app.stageplotter.ca)

Deployed to **Cloudflare Pages** using `@sveltejs/adapter-cloudflare`.

```bash
bun run build
```

The output is in `app/.svelte-kit/cloudflare/`. Connect the repo to Cloudflare Pages
with build command `cd app && bun run build` and output directory `app/.svelte-kit/cloudflare`.

Important: Cloudflare Pages must be configured to send COOP/COEP headers.
Add a `_headers` file to `app/static/`:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

## Marketing Site (stageplotter.ca)

Also deployed to **Cloudflare Pages** from the `marketing/` directory.

```bash
bun run build:marketing
```

## Desktop App

Built with **Tauri v2** for macOS, Windows, and Linux.

```bash
bun run build:desktop
```

Distribution:

- macOS: `.dmg` and `.app` in `app/desktop/src-tauri/target/release/bundle/`
- Windows: `.msi` and `.exe`
- Linux: `.AppImage` and `.deb`

## License Model

- **PWA**: Free under AGPL-3.0
- **Desktop**: Commercial EULA ($25 CAD)
- **Pro features**: Separate private repo (not subject to AGPL)
