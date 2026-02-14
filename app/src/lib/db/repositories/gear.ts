// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export type GearCategory =
	| 'guitars'
	| 'bass'
	| 'keys'
	| 'strings'
	| 'winds'
	| 'percussion'
	| 'drums'
	| 'amps'
	| 'mics'
	| 'monitors'
	| 'equipment'
	| 'other';

export interface GearItemRow {
	id: string;
	name: string;
	category: GearCategory;
	notes: string | null;
	created_at?: string;
	updated_at?: string;
}

export async function listGearItems(): Promise<GearItemRow[]> {
	return db.query<GearItemRow>(
		'SELECT id, name, category, notes, created_at FROM gear_items ORDER BY updated_at DESC'
	);
}

export async function createGearItem(
	id: string,
	name: string,
	category: GearCategory = 'other'
): Promise<void> {
	await db.run('INSERT INTO gear_items (id, name, category) VALUES (?, ?, ?)', [
		id,
		name,
		category
	]);
}

export async function updateGearItemName(id: string, name: string): Promise<void> {
	await db.run("UPDATE gear_items SET name = ?, updated_at = datetime('now') WHERE id = ?", [
		name,
		id
	]);
}

export async function updateGearItem(
	id: string,
	data: Partial<Pick<GearItemRow, 'name' | 'category' | 'notes'>>
): Promise<void> {
	const sets: string[] = [];
	const params: unknown[] = [];
	if (data.name !== undefined) {
		sets.push('name = ?');
		params.push(data.name);
	}
	if (data.category !== undefined) {
		sets.push('category = ?');
		params.push(data.category);
	}
	if (data.notes !== undefined) {
		sets.push('notes = ?');
		params.push(data.notes);
	}
	if (sets.length === 0) return;
	sets.push("updated_at = datetime('now')");
	params.push(id);
	await db.run(`UPDATE gear_items SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteGearItem(id: string): Promise<void> {
	await db.run('DELETE FROM gear_items WHERE id = ?', [id]);
}

export async function duplicateGearItem(sourceId: string, newId: string): Promise<void> {
	await db.run(
		`INSERT INTO gear_items (id, name, category, notes)
		 SELECT ?, name || ' (copy)', category, notes
		 FROM gear_items WHERE id = ?`,
		[newId, sourceId]
	);
}
