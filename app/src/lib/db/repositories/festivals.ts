// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

// --- Festival types ---

export interface FestivalRow {
	id: string;
	name: string;
	created_at?: string;
	updated_at?: string;
}

export interface FestivalDayRow {
	id: string;
	festival_id: string;
	name: string;
	date: string | null;
	sort_order: number;
}

export type SlotType = 'set' | 'headliner' | 'changeover' | 'soundcheck' | 'announcement' | 'other';

export interface FestivalSlotRow {
	id: string;
	festival_day_id: string;
	slot_type: SlotType;
	title: string;
	time_start: number | null;
	time_end: number | null;
	duration: number | null;
	band_id: string | null;
	plot_id: string | null;
	note: string;
	colour: string;
	sort_order: number;
}

export const SLOT_TYPES: { value: SlotType; label: string; colour: string }[] = [
	{ value: 'set', label: 'Set', colour: '#339E4E' },
	{ value: 'headliner', label: 'Headliner', colour: '#FFAB33' },
	{ value: 'changeover', label: 'Changeover', colour: '#3E75E8' },
	{ value: 'soundcheck', label: 'Soundcheck', colour: '#A790F5' },
	{ value: 'announcement', label: 'Announcement', colour: '#ED3333' },
	{ value: 'other', label: 'Other', colour: '#9d9d9d' }
];

// --- Festivals ---

export async function listFestivals(): Promise<FestivalRow[]> {
	return db.query<FestivalRow>(
		'SELECT id, name, created_at FROM festivals ORDER BY updated_at DESC'
	);
}

export async function getFestivalById(id: string): Promise<FestivalRow | null> {
	return db.queryOne<FestivalRow>('SELECT id, name, created_at FROM festivals WHERE id = ?', [id]);
}

export async function createFestival(id: string, name: string): Promise<void> {
	await db.run('INSERT INTO festivals (id, name) VALUES (?, ?)', [id, name]);
}

export async function updateFestivalName(id: string, name: string): Promise<void> {
	await db.run("UPDATE festivals SET name = ?, updated_at = datetime('now') WHERE id = ?", [
		name,
		id
	]);
}

export async function deleteFestival(id: string): Promise<void> {
	await db.run('DELETE FROM festivals WHERE id = ?', [id]);
}

// --- Festival Days ---

export async function listFestivalDays(festivalId: string): Promise<FestivalDayRow[]> {
	return db.query<FestivalDayRow>(
		'SELECT id, festival_id, name, date, sort_order FROM festival_days WHERE festival_id = ? ORDER BY sort_order',
		[festivalId]
	);
}

export async function createFestivalDay(
	id: string,
	festivalId: string,
	name: string,
	sortOrder: number
): Promise<void> {
	await db.run(
		'INSERT INTO festival_days (id, festival_id, name, sort_order) VALUES (?, ?, ?, ?)',
		[id, festivalId, name, sortOrder]
	);
}

export async function updateFestivalDay(
	id: string,
	data: Partial<Pick<FestivalDayRow, 'name' | 'date' | 'sort_order'>>
): Promise<void> {
	const sets: string[] = [];
	const params: unknown[] = [];
	if (data.name !== undefined) {
		sets.push('name = ?');
		params.push(data.name);
	}
	if (data.date !== undefined) {
		sets.push('date = ?');
		params.push(data.date);
	}
	if (data.sort_order !== undefined) {
		sets.push('sort_order = ?');
		params.push(data.sort_order);
	}
	if (sets.length === 0) return;
	sets.push("updated_at = datetime('now')");
	params.push(id);
	await db.run(`UPDATE festival_days SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteFestivalDay(id: string): Promise<void> {
	await db.run('DELETE FROM festival_days WHERE id = ?', [id]);
}

// --- Festival Slots ---

export async function listFestivalSlots(dayId: string): Promise<FestivalSlotRow[]> {
	return db.query<FestivalSlotRow>(
		`SELECT id, festival_day_id, slot_type, title, time_start, time_end,
			duration, band_id, plot_id, note, colour, sort_order
		 FROM festival_slots WHERE festival_day_id = ? ORDER BY sort_order`,
		[dayId]
	);
}

export async function createFestivalSlot(
	id: string,
	dayId: string,
	data: {
		slot_type: SlotType;
		title: string;
		sort_order: number;
		time_start?: number | null;
		duration?: number | null;
	}
): Promise<void> {
	const timeEnd =
		data.time_start != null && data.duration != null ? data.time_start + data.duration : null;
	await db.run(
		`INSERT INTO festival_slots (id, festival_day_id, slot_type, title, time_start, time_end, duration, sort_order)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			id,
			dayId,
			data.slot_type,
			data.title,
			data.time_start ?? null,
			timeEnd,
			data.duration ?? null,
			data.sort_order
		]
	);
}

export async function updateFestivalSlot(
	id: string,
	data: Partial<
		Pick<
			FestivalSlotRow,
			| 'slot_type'
			| 'title'
			| 'time_start'
			| 'time_end'
			| 'duration'
			| 'note'
			| 'colour'
			| 'sort_order'
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

	// Auto-compute time_end when start + duration both provided
	if (data.time_start !== undefined || data.duration !== undefined) {
		// We need to fetch current values if partial
		const current = await db.queryOne<{ time_start: number | null; duration: number | null }>(
			'SELECT time_start, duration FROM festival_slots WHERE id = ?',
			[id]
		);
		const start = data.time_start ?? current?.time_start ?? null;
		const dur = data.duration ?? current?.duration ?? null;
		const end = start != null && dur != null ? start + dur : null;
		// Remove any existing time_end set and add the computed one
		const endIdx = sets.findIndex((s) => s.startsWith('time_end'));
		if (endIdx >= 0) {
			sets.splice(endIdx, 1);
			params.splice(endIdx, 1);
		}
		sets.push('time_end = ?');
		params.push(end);
	}

	sets.push("updated_at = datetime('now')");
	params.push(id);
	await db.run(`UPDATE festival_slots SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function deleteFestivalSlot(id: string): Promise<void> {
	await db.run('DELETE FROM festival_slots WHERE id = ?', [id]);
}
