// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 8;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`ALTER TABLE gigs ADD COLUMN set_time TEXT`);
	await db.exec(`ALTER TABLE gigs ADD COLUMN changeover_minutes INTEGER`);
	await db.exec(`ALTER TABLE songs ADD COLUMN starred INTEGER DEFAULT 0`);
}
