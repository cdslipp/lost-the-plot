// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';
import { insertMany } from '$lib/db/batch';

export interface PersonRow {
	id: number;
	band_id?: string;
	name: string;
	role: string | null;
	pronouns?: string | null;
	phone: string | null;
	email: string | null;
	member_type: string | null;
	status: string | null;
}

export interface PersonSummary {
	id: number;
	name: string;
	role: string | null;
}

export interface PersonWithMemberType extends PersonSummary {
	member_type: string | null;
}

export async function getPersonsByBandId(bandId: string): Promise<PersonRow[]> {
	return db.query<PersonRow>(
		'SELECT id, name, role, phone, email, member_type, status FROM persons WHERE band_id = ? ORDER BY name',
		[bandId]
	);
}

export async function getFullPersonsByBandId(bandId: string): Promise<PersonRow[]> {
	return db.query<PersonRow>(
		'SELECT id, name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ? ORDER BY name',
		[bandId]
	);
}

export async function getActivePersonsByBandId(bandId: string): Promise<PersonWithMemberType[]> {
	return db.query<PersonWithMemberType>(
		'SELECT id, name, role, member_type FROM persons WHERE band_id = ? AND status != ? ORDER BY name',
		[bandId, 'inactive']
	);
}

export async function getPersonsForPlot(plotId: string): Promise<PersonSummary[]> {
	return db.query<PersonSummary>(
		`SELECT p.id, p.name, p.role FROM persons p
		 INNER JOIN plot_persons pp ON pp.person_id = p.id
		 WHERE pp.plot_id = ? ORDER BY p.name`,
		[plotId]
	);
}

export async function getPersonsForExport(bandId: string): Promise<PersonRow[]> {
	return db.query<PersonRow>(
		'SELECT id, band_id, name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ?',
		[bandId]
	);
}

export async function getAllPersonsForExport(): Promise<PersonRow[]> {
	return db.query<PersonRow>(
		'SELECT id, band_id, name, role, pronouns, phone, email, member_type, status FROM persons'
	);
}

export async function createPerson(
	bandId: string,
	name: string,
	opts: {
		role?: string | null;
		pronouns?: string | null;
		phone?: string | null;
		email?: string | null;
		member_type?: string;
		status?: string;
	} = {}
): Promise<number> {
	const result = await db.run(
		'INSERT INTO persons (band_id, name, role, pronouns, phone, email, member_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		[
			bandId,
			name,
			opts.role ?? null,
			opts.pronouns ?? null,
			opts.phone ?? null,
			opts.email ?? null,
			opts.member_type ?? 'performer',
			opts.status ?? 'permanent'
		]
	);
	return result.lastInsertRowid;
}

export async function insertPersonsForBand(
	bandId: string,
	persons: Array<{
		name: string;
		role: string | null;
		pronouns: string | null;
		phone: string | null;
		email: string | null;
		member_type: string | null;
		status: string | null;
	}>
): Promise<void> {
	if (persons.length === 0) return;
	const rows = persons.map((person) => [
		bandId,
		person.name,
		person.role,
		person.pronouns,
		person.phone,
		person.email,
		person.member_type,
		person.status
	]);
	await insertMany(
		'persons',
		['band_id', 'name', 'role', 'pronouns', 'phone', 'email', 'member_type', 'status'],
		rows
	);
}

export async function updatePersonField(
	personId: number,
	field: string,
	value: string | null
): Promise<void> {
	await db.run(`UPDATE persons SET ${field} = ? WHERE id = ?`, [value || null, personId]);
}

export async function deletePerson(personId: number): Promise<void> {
	await db.run('DELETE FROM persons WHERE id = ?', [personId]);
}

export async function deletePersonsByBandId(bandId: string): Promise<void> {
	await db.run('DELETE FROM persons WHERE band_id = ?', [bandId]);
}
