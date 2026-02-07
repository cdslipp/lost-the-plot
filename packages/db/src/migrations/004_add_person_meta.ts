// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 4;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`ALTER TABLE persons ADD COLUMN member_type TEXT DEFAULT 'performer';`);
	await db.exec(`ALTER TABLE persons ADD COLUMN status TEXT DEFAULT 'permanent';`);
}
