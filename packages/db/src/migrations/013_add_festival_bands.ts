// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 13;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS festival_bands (
			id                TEXT PRIMARY KEY,
			festival_id       TEXT NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
			name              TEXT NOT NULL DEFAULT 'Unnamed Band',
			website           TEXT,
			notes             TEXT,
			plot_url          TEXT,
			plot_id           TEXT REFERENCES stage_plots(id) ON DELETE SET NULL,
			file_path         TEXT,
			file_type         TEXT,
			original_filename TEXT,
			sort_order        INTEGER DEFAULT 0,
			created_at        TEXT DEFAULT (datetime('now')),
			updated_at        TEXT DEFAULT (datetime('now'))
		);
	`);
}
