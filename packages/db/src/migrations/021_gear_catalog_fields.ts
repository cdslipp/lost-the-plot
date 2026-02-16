// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 21;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`ALTER TABLE gear_items ADD COLUMN catalog_item_id TEXT`);
	await db.exec(`ALTER TABLE gear_items ADD COLUMN image_path TEXT`);
}
