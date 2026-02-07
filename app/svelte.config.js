// SPDX-License-Identifier: AGPL-3.0-only
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// Let vite-pwa handle service worker registration
		serviceWorker: {
			register: false
		},
		alias: {
			'@stageplotter/db': '../packages/db/src/index.ts',
			'@stageplotter/db/opfs': '../packages/db/src/adapter-opfs.ts',
			'@stageplotter/db/tauri': '../packages/db/src/adapter-tauri.ts',
			'@stageplotter/db/memory': '../packages/db/src/adapter-memory.ts',
			'@stageplotter/shared': '../packages/shared/src/index.ts',
			'@stageplotter/shared/*': '../packages/shared/src/*'
		}
	}
};

export default config;
