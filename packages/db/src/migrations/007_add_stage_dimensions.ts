// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 7;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN stage_width INTEGER DEFAULT 24`);
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN stage_depth INTEGER DEFAULT 16`);
}
