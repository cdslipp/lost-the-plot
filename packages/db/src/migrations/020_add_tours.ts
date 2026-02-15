// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 20;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS tours (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			band_id TEXT NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
			name TEXT NOT NULL DEFAULT 'Untitled Tour',
			start_date TEXT,
			end_date TEXT,
			notes TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		)
	`);

	await db.exec(`ALTER TABLE gigs ADD COLUMN tour_id TEXT REFERENCES tours(id) ON DELETE SET NULL`);
}
