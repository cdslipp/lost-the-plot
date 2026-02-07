// SPDX-License-Identifier: AGPL-3.0-only
// Tauri doesn't have a Node.js server to do proper SSR
// so we use adapter-static with a fallback to index.html to put the site in SPA mode
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    alias: {
      '@stageplotter/db': '../../packages/db/src/index.ts',
      '@stageplotter/db/opfs': '../../packages/db/src/adapter-opfs.ts',
      '@stageplotter/db/tauri': '../../packages/db/src/adapter-tauri.ts',
      '@stageplotter/db/memory': '../../packages/db/src/adapter-memory.ts',
      '@stageplotter/shared': '../../packages/shared/src/index.ts',
      '@stageplotter/shared/*': '../../packages/shared/src/*'
    }
  },
};

export default config;
