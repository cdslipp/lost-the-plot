// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 1;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS stage_plots (
			id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
			name TEXT NOT NULL DEFAULT 'Untitled',
			revision_date TEXT DEFAULT (date('now')),
			canvas_width INTEGER DEFAULT 1100,
			canvas_height INTEGER DEFAULT 850,
			metadata TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			name TEXT NOT NULL DEFAULT '',
			type TEXT NOT NULL DEFAULT 'input',
			category TEXT,
			current_variant TEXT DEFAULT 'default',
			pos_x REAL NOT NULL DEFAULT 0,
			pos_y REAL NOT NULL DEFAULT 0,
			width REAL NOT NULL DEFAULT 80,
			height REAL NOT NULL DEFAULT 60,
			channel TEXT DEFAULT '',
			musician TEXT DEFAULT '',
			item_data TEXT,
			sort_order INTEGER DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS musicians (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			instrument TEXT DEFAULT ''
		);
	`);
}
