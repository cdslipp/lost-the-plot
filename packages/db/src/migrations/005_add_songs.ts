// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 5;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS songs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			band_id TEXT NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			starting_key TEXT,
			starting_tempo INTEGER,
			instruments TEXT,
			notes TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);
	`);
}
