// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export type BacklineCategory = 'amps' | 'drums' | 'keys' | 'monitors' | 'mics' | 'di' | 'other';
export type BacklineProvision = 'venue' | 'band' | 'rental' | 'tbd';

export interface FestivalBandBacklineRow {
	id: string;
	festival_band_id: string;
	category: BacklineCategory;
	description: string;
	provision: BacklineProvision;
	notes: string | null;
	sort_order: number;
	created_at?: string;
	updated_at?: string;
}

export async function listBacklineItems(
	festivalBandId: string
): Promise<FestivalBandBacklineRow[]> {
	return db.query<FestivalBandBacklineRow>(
		`SELECT id, festival_band_id, category, description, provision, notes, sort_order, created_at, updated_at
		 FROM festival_band_backline WHERE festival_band_id = ? ORDER BY sort_order`,
		[festivalBandId]
	);
}

export async function createBacklineItem(id: string, festivalBandId: string): Promise<void> {
	const maxOrder = await db.queryOne<{ max_order: number | null }>(
		'SELECT MAX(sort_order) as max_order FROM festival_band_backline WHERE festival_band_id = ?',
		[festivalBandId]
	);
	const sortOrder = (maxOrder?.max_order ?? -1) + 1;
	await db.run(
		'INSERT INTO festival_band_backline (id, festival_band_id, sort_order) VALUES (?, ?, ?)',
		[id, festivalBandId, sortOrder]
	);
}

export async function updateBacklineItem(
	id: string,
	data: Partial<Pick<FestivalBandBacklineRow, 'category' | 'description' | 'provision' | 'notes'>>
): Promise<void> {
	const sets: string[] = [];
	const params: unknown[] = [];
	for (const [key, value] of Object.entries(data)) {
		if (value !== undefined) {
			sets.push(`${key} = ?`);
			params.push(value);
		}
	}
	if (sets.length === 0) return;
	sets.push("updated_at = datetime('now')");
	params.push(id);
	await db.run(`UPDATE festival_band_backline SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteBacklineItem(id: string): Promise<void> {
	await db.run('DELETE FROM festival_band_backline WHERE id = ?', [id]);
}
