// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 12;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS festival_days (
			id          TEXT PRIMARY KEY,
			festival_id TEXT NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
			name        TEXT NOT NULL DEFAULT 'Day 1',
			date        TEXT,
			sort_order  INTEGER DEFAULT 0,
			created_at  TEXT DEFAULT (datetime('now')),
			updated_at  TEXT DEFAULT (datetime('now'))
		);
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS festival_slots (
			id              TEXT PRIMARY KEY,
			festival_day_id TEXT NOT NULL REFERENCES festival_days(id) ON DELETE CASCADE,
			slot_type       TEXT NOT NULL DEFAULT 'set',
			title           TEXT NOT NULL DEFAULT '',
			time_start      INTEGER,
			time_end        INTEGER,
			duration        INTEGER,
			band_id         TEXT REFERENCES bands(id),
			plot_id         TEXT REFERENCES stage_plots(id),
			note            TEXT DEFAULT '',
			colour          TEXT DEFAULT '',
			sort_order      INTEGER DEFAULT 0,
			created_at      TEXT DEFAULT (datetime('now')),
			updated_at      TEXT DEFAULT (datetime('now'))
		);
	`);
}
