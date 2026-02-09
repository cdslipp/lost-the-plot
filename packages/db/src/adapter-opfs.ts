// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from './types.js';

/**
 * OPFS SQLite adapter for PWA environments.
 * Delegates all operations to a Web Worker running SQLite WASM with OPFS persistence.
 * This is a thin re-export wrapper — the actual worker is loaded by the app's
 * `$lib/db/sqlite.ts` module (which handles worker lifecycle).
 *
 * In the monorepo, the app's `src/lib/db/adapter.ts` wires this up.
 */
export function createOpfsAdapter(workerModule: {
	initDb: () => Promise<{ opfsAvailable: boolean }>;
	exec: (sql: string) => Promise<void>;
	run: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>;
	query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
	queryOne: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T | null>;
	closeDb: () => Promise<void>;
}): DbAdapter {
	return {
		async init() {
			await workerModule.initDb();
		},
		exec: workerModule.exec,
		run: workerModule.run,
		query: workerModule.query,
		queryOne: workerModule.queryOne,
		close: workerModule.closeDb
	};
}
