// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from './types.js';

/**
 * Tauri SQLite adapter for the desktop app.
 * Wraps `@tauri-apps/plugin-sql` which provides a native SQLite backend.
 *
 * This module is only imported in Tauri builds via dynamic import(),
 * so the `@tauri-apps/plugin-sql` dependency is tree-shaken in PWA builds.
 */
export async function createTauriAdapter(
	dbPath: string = 'sqlite:stageplotter.db'
): Promise<DbAdapter> {
	const Database = (await import('@tauri-apps/plugin-sql')).default;
	const db = await Database.load(dbPath);

	return {
		async init() {
			// Database is already loaded by the time we get here
		},
		async exec(sql: string) {
			await db.execute(sql, []);
		},
		async run(sql: string, params?: unknown[]) {
			const result = await db.execute(sql, params ?? []);
			return {
				changes: result.rowsAffected,
				lastInsertRowid: result.lastInsertId
			};
		},
		async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
			return db.select<T[]>(sql, params ?? []);
		},
		async queryOne<T = Record<string, unknown>>(
			sql: string,
			params?: unknown[]
		): Promise<T | null> {
			const rows = await db.select<T[]>(sql, params ?? []);
			return rows[0] ?? null;
		},
		async close() {
			await db.close();
		}
	};
}
