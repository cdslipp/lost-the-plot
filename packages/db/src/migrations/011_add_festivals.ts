// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 11;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS festivals (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL DEFAULT 'Untitled Festival',
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);
	`);
}
