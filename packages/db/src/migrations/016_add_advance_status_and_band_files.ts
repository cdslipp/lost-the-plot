// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 16;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(
		`ALTER TABLE festival_bands ADD COLUMN advance_status TEXT NOT NULL DEFAULT 'no_contact'`
	);
	await db.exec(`
		CREATE TABLE IF NOT EXISTS festival_band_files (
			id                TEXT PRIMARY KEY,
			festival_band_id  TEXT NOT NULL REFERENCES festival_bands(id) ON DELETE CASCADE,
			file_path         TEXT NOT NULL,
			original_filename TEXT NOT NULL,
			file_type         TEXT,
			colour            TEXT,
			sort_order        INTEGER DEFAULT 0,
			created_at        TEXT DEFAULT (datetime('now')),
			updated_at        TEXT DEFAULT (datetime('now'))
		);
	`);
}
