// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export interface SongRow {
	id: number;
	band_id?: string;
	title: string;
	starting_key: string | null;
	starting_tempo: number | null;
	instruments?: string | null;
	notes?: string | null;
	starred: number;
}

export async function getSongsByBandId(bandId: string): Promise<SongRow[]> {
	return db.query<SongRow>(
		'SELECT id, title, starting_key, starting_tempo, instruments, notes, COALESCE(starred, 0) as starred FROM songs WHERE band_id = ? ORDER BY title',
		[bandId]
	);
}

export async function getSongsForDuplication(bandId: string): Promise<SongRow[]> {
	return db.query<SongRow>(
		'SELECT id, title, starting_key, starting_tempo, instruments, notes, starred FROM songs WHERE band_id = ?',
		[bandId]
	);
}

export async function createSong(
	bandId: string,
	title: string,
	opts: {
		starting_key?: string | null;
		starting_tempo?: number | null;
		instruments?: string | null;
		notes?: string | null;
		starred?: number;
	} = {}
): Promise<number> {
	const result = await db.run(
		'INSERT INTO songs (band_id, title, starting_key, starting_tempo, instruments, notes, starred) VALUES (?, ?, ?, ?, ?, ?, ?)',
		[
			bandId,
			title,
			opts.starting_key ?? null,
			opts.starting_tempo ?? null,
			opts.instruments ?? null,
			opts.notes ?? null,
			opts.starred ?? 0
		]
	);
	return result.lastInsertRowid;
}

export async function updateSongField(
	songId: number,
	field: string,
	value: string | number | null
): Promise<void> {
	await db.run(`UPDATE songs SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [
		value,
		songId
	]);
}

export async function updateSongStarred(songId: number, starred: number): Promise<void> {
	await db.run("UPDATE songs SET starred = ?, updated_at = datetime('now') WHERE id = ?", [
		starred,
		songId
	]);
}

export async function deleteSong(songId: number): Promise<void> {
	await db.run('DELETE FROM songs WHERE id = ?', [songId]);
}

export async function deleteSongsByBandId(bandId: string): Promise<void> {
	await db.run('DELETE FROM songs WHERE band_id = ?', [bandId]);
}
