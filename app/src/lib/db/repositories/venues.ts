// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export interface VenueRow {
	id: number;
	name: string;
	city: string | null;
	region: string | null;
	country: string | null;
	address: string | null;
	capacity: number | null;
	stage_width: number | null;
	stage_depth: number | null;
	contact_name: string | null;
	contact_email: string | null;
	contact_phone: string | null;
	notes: string | null;
	created_at?: string;
	updated_at?: string;
}

export async function listVenues(): Promise<VenueRow[]> {
	return db.query<VenueRow>('SELECT * FROM venues ORDER BY name');
}

export async function getVenueById(id: number): Promise<VenueRow | null> {
	return db.queryOne<VenueRow>('SELECT * FROM venues WHERE id = ?', [id]);
}

export async function createVenue(
	name: string,
	opts: Partial<Omit<VenueRow, 'id' | 'name' | 'created_at' | 'updated_at'>> = {}
): Promise<number> {
	const result = await db.run(
		`INSERT INTO venues (name, city, region, country, address, capacity, stage_width, stage_depth, contact_name, contact_email, contact_phone, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			name,
			opts.city ?? null,
			opts.region ?? null,
			opts.country ?? null,
			opts.address ?? null,
			opts.capacity ?? null,
			opts.stage_width ?? null,
			opts.stage_depth ?? null,
			opts.contact_name ?? null,
			opts.contact_email ?? null,
			opts.contact_phone ?? null,
			opts.notes ?? null
		]
	);
	return result.lastInsertRowid;
}

export async function updateVenueField(
	id: number,
	field: string,
	value: string | number | null
): Promise<void> {
	await db.run(`UPDATE venues SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`, [
		value,
		id
	]);
}

export async function deleteVenue(id: number): Promise<void> {
	await db.run('DELETE FROM venues WHERE id = ?', [id]);
}

export async function searchVenues(query: string): Promise<VenueRow[]> {
	return db.query<VenueRow>(`SELECT * FROM venues WHERE name LIKE ? ORDER BY name LIMIT 20`, [
		`%${query}%`
	]);
}
