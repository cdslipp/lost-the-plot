// SPDX-License-Identifier: AGPL-3.0-only
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [tailwindcss(), sveltekit()],

	// Vite options tailored for Tauri development
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421
				}
			: undefined,
		watch: {
			ignored: ['**/src-tauri/**']
		}
	},

	// Stub out PWA modules for desktop builds
	resolve: {
		alias: {
			'virtual:pwa-register/svelte': new URL('./pwa-stub.ts', import.meta.url).pathname
		}
	}
}));
