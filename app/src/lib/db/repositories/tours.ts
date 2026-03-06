// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';
import type { GigRow } from './gigs';

export interface TourRow {
	id: string;
	band_id: string;
	name: string;
	start_date: string | null;
	end_date: string | null;
	notes: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface TourWithDetails extends TourRow {
	band_name: string;
	gig_count: number;
}

export async function listTours(): Promise<TourWithDetails[]> {
	return db.query<TourWithDetails>(
		`SELECT t.*, b.name as band_name, COUNT(g.id) as gig_count
		 FROM tours t
		 JOIN bands b ON b.id = t.band_id
		 LEFT JOIN gigs g ON g.tour_id = t.id
		 GROUP BY t.id
		 ORDER BY t.updated_at DESC`
	);
}

export async function getTourById(id: string): Promise<TourWithDetails | null> {
	return db.queryOne<TourWithDetails>(
		`SELECT t.*, b.name as band_name, COUNT(g.id) as gig_count
		 FROM tours t
		 JOIN bands b ON b.id = t.band_id
		 LEFT JOIN gigs g ON g.tour_id = t.id
		 WHERE t.id = ?
		 GROUP BY t.id`,
		[id]
	);
}

export async function getToursByBandId(bandId: string): Promise<TourRow[]> {
	return db.query<TourRow>(
		'SELECT * FROM tours WHERE band_id = ? ORDER BY start_date DESC, created_at DESC',
		[bandId]
	);
}

export async function createTour(
	id: string,
	bandId: string,
	name: string,
	opts: { start_date?: string | null; end_date?: string | null; notes?: string | null } = {}
): Promise<void> {
	await db.run(
		'INSERT INTO tours (id, band_id, name, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
		[id, bandId, name, opts.start_date ?? null, opts.end_date ?? null, opts.notes ?? null]
	);
}

export async function updateTourField(
	id: string,
	field: string,
	value: string | number | null
): Promise<void> {
	await db.run(`UPDATE tours SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [
		value,
		id
	]);
}

export async function updateTourName(id: string, name: string): Promise<void> {
	await db.run("UPDATE tours SET name = ?, updated_at = datetime('now') WHERE id = ?", [name, id]);
}

export async function deleteTour(id: string): Promise<void> {
	// Unassign gigs first
	await db.run('UPDATE gigs SET tour_id = NULL WHERE tour_id = ?', [id]);
	await db.run('DELETE FROM tours WHERE id = ?', [id]);
}

export async function getGigsForTour(tourId: string): Promise<GigRow[]> {
	return db.query<GigRow>(
		`SELECT id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes, venue_id, tour_id
		 FROM gigs WHERE tour_id = ? ORDER BY date ASC`,
		[tourId]
	);
}
