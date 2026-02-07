// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 6;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS gigs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			band_id TEXT NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			venue TEXT,
			date TEXT,
			time TEXT,
			plot_id TEXT REFERENCES stage_plots(id) ON DELETE SET NULL,
			notes TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS setlists (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			gig_id INTEGER NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
			name TEXT NOT NULL DEFAULT 'Set 1',
			created_at TEXT DEFAULT (datetime('now'))
		);
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS setlist_songs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			setlist_id INTEGER NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
			song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
			position INTEGER NOT NULL DEFAULT 0,
			notes TEXT,
			UNIQUE(setlist_id, song_id)
		);
	`);
}
