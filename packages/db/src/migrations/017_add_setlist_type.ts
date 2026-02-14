// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 17;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(
		`ALTER TABLE setlists ADD COLUMN type TEXT NOT NULL DEFAULT 'set' CHECK(type IN ('set', 'encore'))`
	);
	await db.exec(
		`ALTER TABLE setlists ADD COLUMN parent_set_id INTEGER REFERENCES setlists(id) ON DELETE CASCADE`
	);
}
