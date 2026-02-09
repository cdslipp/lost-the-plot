// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export interface BandRow {
	id: string;
	name: string;
	created_at?: string;
	updated_at?: string;
}

export interface BandWithPlotCount extends BandRow {
	plot_count: number;
}

export async function listBands(): Promise<BandWithPlotCount[]> {
	return db.query<BandWithPlotCount>(
		`SELECT b.id, b.name, b.created_at,
			(SELECT COUNT(*) FROM stage_plots WHERE band_id = b.id) as plot_count
		 FROM bands b ORDER BY b.updated_at DESC`
	);
}

export async function getBandById(id: string): Promise<BandRow | null> {
	return db.queryOne<BandRow>('SELECT id, name FROM bands WHERE id = ?', [id]);
}

export async function getBandIds(): Promise<string[]> {
	const rows = await db.query<{ id: string }>('SELECT id FROM bands');
	return rows.map((r) => r.id);
}

export async function getAllBands(): Promise<BandRow[]> {
	return db.query<BandRow>(
		'SELECT id, name, created_at, updated_at FROM bands ORDER BY updated_at DESC'
	);
}

export async function createBand(
	id: string,
	name: string,
	createdAt?: string,
	updatedAt?: string
): Promise<void> {
	if (createdAt && updatedAt) {
		await db.run('INSERT INTO bands (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
			id,
			name,
			createdAt,
			updatedAt
		]);
	} else {
		await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [id, name]);
	}
}

export async function updateBandName(id: string, name: string): Promise<void> {
	await db.run("UPDATE bands SET name = ?, updated_at = datetime('now') WHERE id = ?", [name, id]);
}

export async function deleteBandCascade(id: string): Promise<void> {
	// Delete in dependency order
	await db.run(
		'DELETE FROM setlist_songs WHERE setlist_id IN (SELECT id FROM setlists WHERE gig_id IN (SELECT id FROM gigs WHERE band_id = ?))',
		[id]
	);
	await db.run('DELETE FROM setlists WHERE gig_id IN (SELECT id FROM gigs WHERE band_id = ?)', [
		id
	]);
	await db.run('DELETE FROM gigs WHERE band_id = ?', [id]);
	await db.run('DELETE FROM songs WHERE band_id = ?', [id]);
	await db.run('DELETE FROM persons WHERE band_id = ?', [id]);
	await db.run('DELETE FROM stage_plots WHERE band_id = ?', [id]);
	await db.run('DELETE FROM bands WHERE id = ?', [id]);
}
