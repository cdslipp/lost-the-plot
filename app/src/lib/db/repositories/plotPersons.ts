// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

export async function getPlotPersonIds(plotId: string): Promise<number[]> {
	const rows = await db.query<{ person_id: number }>(
		'SELECT person_id FROM plot_persons WHERE plot_id = ?',
		[plotId]
	);
	return rows.map((r) => r.person_id);
}

export async function addPersonToPlot(plotId: string, personId: number): Promise<void> {
	await db.run('INSERT OR IGNORE INTO plot_persons (plot_id, person_id) VALUES (?, ?)', [
		plotId,
		personId
	]);
}

export async function removePersonFromPlot(plotId: string, personId: number): Promise<void> {
	await db.run('DELETE FROM plot_persons WHERE plot_id = ? AND person_id = ?', [plotId, personId]);
}
