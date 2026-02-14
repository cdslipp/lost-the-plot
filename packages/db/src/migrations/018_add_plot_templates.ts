// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 18;

export async function up(db: DbAdapter): Promise<void> {
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN is_template INTEGER DEFAULT 0`);
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN source_plot_id TEXT`);
}
