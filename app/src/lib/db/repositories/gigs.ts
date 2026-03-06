// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export interface GigRow {
	id: number;
	band_id?: string;
	name: string;
	venue: string | null;
	date: string | null;
	time: string | null;
	set_time: string | null;
	changeover_minutes: number | null;
	plot_id: string | null;
	notes: string | null;
	venue_id: number | null;
	tour_id: string | null;
}

export async function getGigsByBandId(bandId: string): Promise<GigRow[]> {
	return db.query<GigRow>(
		'SELECT id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes, venue_id, tour_id FROM gigs WHERE band_id = ? ORDER BY date DESC',
		[bandId]
	);
}

export async function createGig(
	bandId: string,
	name: string,
	opts: {
		venue?: string | null;
		date?: string | null;
		time?: string | null;
		set_time?: string | null;
		changeover_minutes?: number | null;
		plot_id?: string | null;
		notes?: string | null;
		venue_id?: number | null;
		tour_id?: string | null;
	} = {}
): Promise<number> {
	const result = await db.run(
		'INSERT INTO gigs (band_id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes, venue_id, tour_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		[
			bandId,
			name,
			opts.venue ?? null,
			opts.date ?? null,
			opts.time ?? null,
			opts.set_time ?? null,
			opts.changeover_minutes ?? null,
			opts.plot_id ?? null,
			opts.notes ?? null,
			opts.venue_id ?? null,
			opts.tour_id ?? null
		]
	);
	return result.lastInsertRowid;
}

export async function updateGigField(
	gigId: number,
	field: string,
	value: string | number | null
): Promise<void> {
	await db.run(`UPDATE gigs SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [
		value,
		gigId
	]);
}

export async function deleteGig(gigId: number): Promise<void> {
	await db.run('DELETE FROM gigs WHERE id = ?', [gigId]);
}

export async function deleteGigsByBandId(bandId: string): Promise<void> {
	await db.run('DELETE FROM gigs WHERE band_id = ?', [bandId]);
}
