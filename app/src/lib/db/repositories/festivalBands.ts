// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';
import { deleteFile } from '$lib/utils/opfsStorage';

export interface FestivalBandRow {
	id: string;
	festival_id: string;
	name: string;
	website: string | null;
	notes: string | null;
	plot_url: string | null;
	plot_id: string | null;
	file_path: string | null;
	file_type: string | null;
	original_filename: string | null;
	sort_order: number;
	created_at?: string;
	updated_at?: string;
}

export async function listFestivalBands(festivalId: string): Promise<FestivalBandRow[]> {
	return db.query<FestivalBandRow>(
		`SELECT id, festival_id, name, website, notes, plot_url, plot_id,
			file_path, file_type, original_filename, sort_order, created_at, updated_at
		 FROM festival_bands WHERE festival_id = ? ORDER BY sort_order`,
		[festivalId]
	);
}

export async function getFestivalBandById(id: string): Promise<FestivalBandRow | null> {
	return db.queryOne<FestivalBandRow>(
		`SELECT id, festival_id, name, website, notes, plot_url, plot_id,
			file_path, file_type, original_filename, sort_order, created_at, updated_at
		 FROM festival_bands WHERE id = ?`,
		[id]
	);
}

export async function createFestivalBand(
	id: string,
	festivalId: string,
	name: string
): Promise<void> {
	const maxOrder = await db.queryOne<{ max_order: number | null }>(
		'SELECT MAX(sort_order) as max_order FROM festival_bands WHERE festival_id = ?',
		[festivalId]
	);
	const sortOrder = (maxOrder?.max_order ?? -1) + 1;
	await db.run(
		'INSERT INTO festival_bands (id, festival_id, name, sort_order) VALUES (?, ?, ?, ?)',
		[id, festivalId, name, sortOrder]
	);
}

export async function updateFestivalBand(
	id: string,
	data: Partial<
		Pick<
			FestivalBandRow,
			| 'name'
			| 'website'
			| 'notes'
			| 'plot_url'
			| 'plot_id'
			| 'file_path'
			| 'file_type'
			| 'original_filename'
		>
	>
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
	await db.run(`UPDATE festival_bands SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteFestivalBand(id: string): Promise<void> {
	// Delete OPFS file if one exists
	const band = await getFestivalBandById(id);
	if (band?.file_path) {
		await deleteFile(band.file_path);
	}
	await db.run('DELETE FROM festival_bands WHERE id = ?', [id]);
}
