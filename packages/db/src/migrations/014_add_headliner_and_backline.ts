// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 14;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		ALTER TABLE festival_bands ADD COLUMN is_headliner INTEGER NOT NULL DEFAULT 0;
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS festival_band_backline (
			id               TEXT PRIMARY KEY,
			festival_band_id TEXT NOT NULL REFERENCES festival_bands(id) ON DELETE CASCADE,
			category         TEXT NOT NULL DEFAULT 'other',
			description      TEXT NOT NULL DEFAULT '',
			provision        TEXT NOT NULL DEFAULT 'tbd',
			notes            TEXT DEFAULT '',
			sort_order       INTEGER DEFAULT 0,
			created_at       TEXT DEFAULT (datetime('now')),
			updated_at       TEXT DEFAULT (datetime('now'))
		);
	`);
}
