// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 9;

export async function up(db: DbAdapter): Promise<void> {
	// Console type (e.g. 'x32')
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN console_type TEXT DEFAULT NULL`);
	// JSON map of channel number → color id (e.g. {"1":"red","2":"blue"})
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN channel_colors TEXT DEFAULT NULL`);
	// JSON array of linked channel pairs (e.g. [1,3,5] means 1-2, 3-4, 5-6 are linked)
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN stereo_links TEXT DEFAULT NULL`);
	// JSON map of color category → color id (e.g. {"vocals":"red","drums":"blue"})
	await db.exec(
		`ALTER TABLE stage_plots ADD COLUMN category_color_defaults TEXT DEFAULT NULL`
	);
}
