// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';
import { deleteFile } from '$lib/utils/opfsStorage';

export interface FestivalBandFileRow {
	id: string;
	festival_band_id: string;
	file_path: string;
	original_filename: string;
	file_type: string | null;
	colour: string | null;
	sort_order: number;
	created_at?: string;
	updated_at?: string;
}

export async function listBandFiles(festivalBandId: string): Promise<FestivalBandFileRow[]> {
	return db.query<FestivalBandFileRow>(
		`SELECT id, festival_band_id, file_path, original_filename, file_type, colour, sort_order, created_at, updated_at
		 FROM festival_band_files WHERE festival_band_id = ? ORDER BY sort_order`,
		[festivalBandId]
	);
}

export async function createBandFile(
	id: string,
	festivalBandId: string,
	filePath: string,
	originalFilename: string,
	fileType: string | null
): Promise<void> {
	const maxOrder = await db.queryOne<{ max_order: number | null }>(
		'SELECT MAX(sort_order) as max_order FROM festival_band_files WHERE festival_band_id = ?',
		[festivalBandId]
	);
	const sortOrder = (maxOrder?.max_order ?? -1) + 1;
	await db.run(
		'INSERT INTO festival_band_files (id, festival_band_id, file_path, original_filename, file_type, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
		[id, festivalBandId, filePath, originalFilename, fileType, sortOrder]
	);
}

export async function updateBandFile(
	id: string,
	data: Partial<Pick<FestivalBandFileRow, 'colour' | 'sort_order'>>
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
	await db.run(`UPDATE festival_band_files SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteBandFile(id: string): Promise<void> {
	const file = await db.queryOne<FestivalBandFileRow>(
		'SELECT file_path FROM festival_band_files WHERE id = ?',
		[id]
	);
	if (file?.file_path) {
		await deleteFile(file.file_path);
	}
	await db.run('DELETE FROM festival_band_files WHERE id = ?', [id]);
}

export async function deleteAllBandFiles(festivalBandId: string): Promise<void> {
	const files = await listBandFiles(festivalBandId);
	for (const file of files) {
		await deleteFile(file.file_path);
	}
	await db.run('DELETE FROM festival_band_files WHERE festival_band_id = ?', [festivalBandId]);
}
