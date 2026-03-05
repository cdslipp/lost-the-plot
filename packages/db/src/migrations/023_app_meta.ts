// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 23;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`
		CREATE TABLE IF NOT EXISTS _app_meta (
			key TEXT PRIMARY KEY,
			value TEXT,
			updated_at TEXT DEFAULT (datetime('now'))
		)
	`);
}
