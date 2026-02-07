// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 3;

export async function up(db: DbAdapter): Promise<void> {
	// Create persons table
	await db.exec(`
		CREATE TABLE IF NOT EXISTS persons (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			band_id TEXT NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
			musician_id INTEGER REFERENCES musicians(id),
			name TEXT NOT NULL,
			role TEXT,
			pronouns TEXT,
			phone TEXT,
			email TEXT
		);
	`);

	// Add event metadata columns to stage_plots
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN event_name TEXT;`);
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN event_date TEXT;`);
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN event_time TEXT;`);
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN venue TEXT;`);
}
