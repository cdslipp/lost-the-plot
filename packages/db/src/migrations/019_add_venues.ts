// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 19;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS venues (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			city TEXT,
			region TEXT,
			country TEXT,
			address TEXT,
			capacity INTEGER,
			stage_width REAL,
			stage_depth REAL,
			contact_name TEXT,
			contact_email TEXT,
			contact_phone TEXT,
			notes TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		)
	`);

	await db.exec(
		`ALTER TABLE gigs ADD COLUMN venue_id INTEGER REFERENCES venues(id) ON DELETE SET NULL`
	);

	// Migrate existing venue text data to venues table
	const gigsWithVenue = await db.query<{ id: number; venue: string }>(
		`SELECT id, venue FROM gigs WHERE venue IS NOT NULL AND venue != ''`
	);

	// Deduplicate venue names
	const venueNameToId = new Map<string, number>();
	for (const gig of gigsWithVenue) {
		const venueName = gig.venue.trim();
		if (!venueName) continue;

		if (!venueNameToId.has(venueName)) {
			const result = await db.run(`INSERT INTO venues (name) VALUES (?)`, [venueName]);
			venueNameToId.set(venueName, result.lastInsertRowid);
		}

		const venueId = venueNameToId.get(venueName)!;
		await db.run(`UPDATE gigs SET venue_id = ? WHERE id = ?`, [venueId, gig.id]);
	}
}
