// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export type SetlistType = 'set' | 'encore';

export interface SetlistRow {
	id: number;
	gig_id: number;
	name: string;
	type: SetlistType;
	parent_set_id: number | null;
}

export interface SetlistSongRow {
	id: number;
	setlist_id: number;
	song_id: number;
	position: number;
	notes: string | null;
	title?: string;
	starting_key?: string | null;
	starting_tempo?: number | null;
}

export async function getSetlistsByGigId(gigId: number): Promise<SetlistRow[]> {
	return db.query<SetlistRow>(
		'SELECT id, gig_id, name, type, parent_set_id FROM setlists WHERE gig_id = ? ORDER BY id',
		[gigId]
	);
}

export async function getSetlistsByGigIds(gigIds: number[]): Promise<SetlistRow[]> {
	if (gigIds.length === 0) return [];
	const placeholders = gigIds.map(() => '?').join(',');
	return db.query<SetlistRow>(
		`SELECT id, gig_id, name, type, parent_set_id FROM setlists WHERE gig_id IN (${placeholders})`,
		gigIds
	);
}

export async function createSetlist(
	gigId: number,
	name: string,
	type: SetlistType = 'set',
	parentSetId: number | null = null
): Promise<number> {
	const result = await db.run(
		'INSERT INTO setlists (gig_id, name, type, parent_set_id) VALUES (?, ?, ?, ?)',
		[gigId, name, type, parentSetId]
	);
	return result.lastInsertRowid;
}

export async function renameSetlist(setlistId: number, name: string): Promise<void> {
	await db.run('UPDATE setlists SET name = ? WHERE id = ?', [name, setlistId]);
}

export async function deleteSetlist(setlistId: number): Promise<void> {
	await db.run('DELETE FROM setlist_songs WHERE setlist_id = ?', [setlistId]);
	await db.run('DELETE FROM setlists WHERE id = ?', [setlistId]);
}

// Setlist songs

export async function getSetlistSongs(setlistId: number): Promise<SetlistSongRow[]> {
	return db.query<SetlistSongRow>(
		`SELECT ss.id, ss.setlist_id, ss.song_id, ss.position, ss.notes, s.title, s.starting_key, s.starting_tempo
		 FROM setlist_songs ss JOIN songs s ON s.id = ss.song_id
		 WHERE ss.setlist_id = ? ORDER BY ss.position`,
		[setlistId]
	);
}

export async function getSetlistSongsBySetlistIds(setlistIds: number[]): Promise<SetlistSongRow[]> {
	if (setlistIds.length === 0) return [];
	const placeholders = setlistIds.map(() => '?').join(',');
	return db.query<SetlistSongRow>(
		`SELECT setlist_id, song_id, position, notes FROM setlist_songs WHERE setlist_id IN (${placeholders})`,
		setlistIds
	);
}

export async function getSetlistSongsWithSongInfoBySetlistIds(
	setlistIds: number[]
): Promise<SetlistSongRow[]> {
	if (setlistIds.length === 0) return [];
	const placeholders = setlistIds.map(() => '?').join(',');
	return db.query<SetlistSongRow>(
		`SELECT ss.id, ss.setlist_id, ss.song_id, ss.position, ss.notes,
		        s.title, s.starting_key, s.starting_tempo
		 FROM setlist_songs ss
		 JOIN songs s ON s.id = ss.song_id
		 WHERE ss.setlist_id IN (${placeholders})
		 ORDER BY ss.setlist_id, ss.position`,
		setlistIds
	);
}

export async function addSongToSetlist(
	setlistId: number,
	songId: number,
	position: number,
	notes?: string | null
): Promise<number> {
	const result = await db.run(
		'INSERT INTO setlist_songs (setlist_id, song_id, position, notes) VALUES (?, ?, ?, ?)',
		[setlistId, songId, position, notes ?? null]
	);
	return result.lastInsertRowid;
}

export async function removeSetlistSong(entryId: number): Promise<void> {
	await db.run('DELETE FROM setlist_songs WHERE id = ?', [entryId]);
}

export async function updateSetlistSongPosition(entryId: number, position: number): Promise<void> {
	await db.run('UPDATE setlist_songs SET position = ? WHERE id = ?', [position, entryId]);
}

export async function updateSetlistSongNotes(entryId: number, notes: string | null): Promise<void> {
	await db.run('UPDATE setlist_songs SET notes = ? WHERE id = ?', [notes, entryId]);
}
