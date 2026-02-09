// SPDX-License-Identifier: AGPL-3.0-only
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const appPackage = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

/**
 * Vite plugin to serve sqlite3-opfs-async-proxy.js without ES module transformation.
 * The sqlite-wasm library loads this file as a classic worker, but Vite transforms it
 * to include `export {}` which causes a syntax error in classic workers.
 */
function sqliteOpfsProxyPlugin(): Plugin {
	return {
		name: 'sqlite-opfs-proxy-fix',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.includes('sqlite3-opfs-async-proxy.js')) {
					// Use require.resolve to find the package regardless of node_modules hoisting
					const sqlitePkg = require.resolve('@sqlite.org/sqlite-wasm/package.json');
					const filePath = path.resolve(
						path.dirname(sqlitePkg),
						'dist/sqlite3-opfs-async-proxy.js'
					);
					let content = fs.readFileSync(filePath, 'utf-8');
					// Remove the ES module export statement that breaks classic workers
					content = content.replace(/export\s*\{\s*\}\s*;?\s*$/, '');
					res.setHeader('Content-Type', 'application/javascript');
					res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
					res.end(content);
					return;
				}
				next();
			});
		}
	};
}

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(appPackage.version)
	},
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	worker: {
		format: 'es'
	},
	plugins: [
		sqliteOpfsProxyPlugin(),
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'prompt',
			devOptions: {
				enabled: false
			},
			manifest: {
				name: 'StagePlotter',
				short_name: 'StagePlotter',
				description: 'Create professional stage plots for live music',
				theme_color: '#1e40af',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
				globIgnores: ['**/sqlite3*.wasm']
			}
		})
	],

	optimizeDeps: {
		exclude: ['@sqlite.org/sqlite-wasm']
	},

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'client',

					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},

					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
