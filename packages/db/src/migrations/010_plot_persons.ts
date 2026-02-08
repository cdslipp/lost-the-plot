// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 10;

export async function up(db: DbAdapter): Promise<void> {
	// Create plot_persons junction table
	await db.exec(`
		CREATE TABLE IF NOT EXISTS plot_persons (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
			UNIQUE(plot_id, person_id)
		)
	`);
	await db.exec(`CREATE INDEX IF NOT EXISTS idx_plot_persons_plot ON plot_persons(plot_id)`);
	await db.exec(`CREATE INDEX IF NOT EXISTS idx_plot_persons_person ON plot_persons(person_id)`);

	// Migrate existing data: convert metadata.musicians[] to plot_persons rows
	// and convert item.musician (string) to item.person_id (number)
	const plots = await db.query<{ id: string; metadata: string | null; band_id: string | null }>(
		'SELECT id, metadata, band_id FROM stage_plots'
	);

	for (const plot of plots) {
		if (!plot.metadata || !plot.band_id) continue;

		let meta: any;
		try {
			meta = JSON.parse(plot.metadata);
		} catch {
			continue;
		}

		const musicians: { id: number; name: string; instrument: string }[] = meta.musicians || [];
		if (musicians.length === 0 && (!meta.items || meta.items.length === 0)) continue;

		// Load band persons for matching
		const bandPersons = await db.query<{ id: number; name: string }>(
			'SELECT id, name FROM persons WHERE band_id = ?',
			[plot.band_id]
		);
		const personByName = new Map(bandPersons.map((p) => [p.name.toLowerCase(), p]));

		// Map musician name -> person_id
		const musicianToPersonId = new Map<string, number>();

		for (const musician of musicians) {
			const existing = personByName.get(musician.name.toLowerCase());
			if (existing) {
				musicianToPersonId.set(musician.name, existing.id);
			} else {
				// Create a new person in the persons table
				const result = await db.run(
					'INSERT INTO persons (band_id, name, role, member_type, status) VALUES (?, ?, ?, ?, ?)',
					[plot.band_id, musician.name, musician.instrument || null, 'performer', 'permanent']
				);
				musicianToPersonId.set(musician.name, result.lastInsertRowid);
			}
		}

		// Insert into plot_persons
		for (const [, personId] of musicianToPersonId) {
			await db.run(
				'INSERT OR IGNORE INTO plot_persons (plot_id, person_id) VALUES (?, ?)',
				[plot.id, personId]
			);
		}

		// Convert items: musician (string) -> person_id (number | null)
		let changed = false;
		if (meta.items && Array.isArray(meta.items)) {
			for (const item of meta.items) {
				if (item.musician && typeof item.musician === 'string') {
					const personId = musicianToPersonId.get(item.musician);
					item.person_id = personId ?? null;
					delete item.musician;
					changed = true;
				} else if (!('person_id' in item)) {
					item.person_id = null;
					if ('musician' in item) delete item.musician;
					changed = true;
				}
			}
		}

		// Remove musicians array from metadata
		if (meta.musicians) {
			delete meta.musicians;
			changed = true;
		}

		if (changed) {
			await db.run('UPDATE stage_plots SET metadata = ? WHERE id = ?', [
				JSON.stringify(meta),
				plot.id
			]);
		}
	}
}
