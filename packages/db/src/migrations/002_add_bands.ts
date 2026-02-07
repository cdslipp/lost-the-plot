// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 2;

export async function up(db: DbAdapter): Promise<void> {
	// Create bands table
	await db.exec(`
		CREATE TABLE IF NOT EXISTS bands (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			name TEXT NOT NULL DEFAULT 'Untitled Band',
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);
	`);

	// Add band_id column to stage_plots
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN band_id TEXT REFERENCES bands(id);`);

	// Data migration: if a row with id = 'default' exists, create a band and link it
	const defaultPlot = await db.queryOne<{ id: string; name: string }>(
		`SELECT id, name FROM stage_plots WHERE id = 'default'`
	);

	if (defaultPlot) {
		const bandId = crypto.randomUUID().replace(/-/g, '');
		const bandName = defaultPlot.name || 'My Band';

		await db.run(`INSERT INTO bands (id, name) VALUES (?, ?)`, [bandId, bandName]);
		await db.run(`UPDATE stage_plots SET band_id = ? WHERE id = 'default'`, [bandId]);
	}
}
