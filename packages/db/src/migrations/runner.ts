// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export interface Migration {
	version: number;
	up: (db: DbAdapter) => Promise<void>;
}

/**
 * Run all pending migrations in order.
 * Tracks applied versions in a `_migrations` meta-table.
 */
export async function runMigrations(db: DbAdapter, migrations: Migration[]): Promise<void> {
	// Create meta-table if it doesn't exist
	await db.exec(`
		CREATE TABLE IF NOT EXISTS _migrations (
			version INTEGER PRIMARY KEY,
			applied_at TEXT DEFAULT (datetime('now'))
		);
	`);

	// Get already-applied versions
	const applied = await db.query<{ version: number }>('SELECT version FROM _migrations ORDER BY version');
	const appliedSet = new Set(applied.map((r) => r.version));

	// Sort migrations by version and apply only unapplied ones
	const sorted = [...migrations].sort((a, b) => a.version - b.version);

	for (const migration of sorted) {
		if (appliedSet.has(migration.version)) continue;

		await migration.up(db);
		await db.run('INSERT INTO _migrations (version) VALUES (?)', [migration.version]);
	}
}
