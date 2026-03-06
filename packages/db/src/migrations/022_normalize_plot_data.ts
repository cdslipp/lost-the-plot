// SPDX-License-Identifier: AGPL-3.0-only

import type { DbAdapter } from '../types.js';

export const version = 22;

export async function up(db: DbAdapter): Promise<void> {
	// --- New tables ---

	await db.exec(`
		CREATE TABLE IF NOT EXISTS plot_items (
			id INTEGER NOT NULL,
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			name TEXT NOT NULL DEFAULT '',
			type TEXT NOT NULL DEFAULT 'input',
			category TEXT,
			current_variant TEXT DEFAULT 'default',
			pos_x REAL NOT NULL DEFAULT 0,
			pos_y REAL NOT NULL DEFAULT 0,
			width REAL NOT NULL DEFAULT 0,
			height REAL NOT NULL DEFAULT 0,
			rotation REAL NOT NULL DEFAULT 0,
			person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
			item_data TEXT,
			sort_order INTEGER DEFAULT 0,
			size TEXT,
			PRIMARY KEY (plot_id, id)
		)
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS plot_outputs (
			id INTEGER NOT NULL,
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			name TEXT NOT NULL DEFAULT '',
			link_mode TEXT DEFAULT 'mono',
			item_data TEXT,
			PRIMARY KEY (plot_id, id)
		)
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS plot_input_channels (
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			channel_num INTEGER NOT NULL,
			item_id INTEGER,
			color TEXT,
			name TEXT,
			short_name TEXT,
			phantom INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (plot_id, channel_num)
		)
	`);

	await db.exec(`
		CREATE TABLE IF NOT EXISTS plot_output_channels (
			plot_id TEXT NOT NULL REFERENCES stage_plots(id) ON DELETE CASCADE,
			channel_num INTEGER NOT NULL,
			output_id INTEGER,
			PRIMARY KEY (plot_id, channel_num)
		)
	`);

	// Add output_stereo_links column to stage_plots
	await db.exec(`ALTER TABLE stage_plots ADD COLUMN output_stereo_links TEXT`);

	// --- Data migration ---
	const plots = await db.query<{ id: string; metadata: string | null }>(
		'SELECT id, metadata FROM stage_plots'
	);

	for (const plot of plots) {
		let meta: any = {};
		try {
			meta = JSON.parse(plot.metadata || '{}');
		} catch {
			meta = {};
		}

		const items: any[] = Array.isArray(meta.items) ? meta.items : [];
		const outputs: any[] = Array.isArray(meta.outputs) ? meta.outputs : [];
		const inputChannels: any[] = Array.isArray(meta.inputChannels) ? meta.inputChannels : [];
		const outputChannels: any[] = Array.isArray(meta.outputChannels) ? meta.outputChannels : [];
		const outputStereoLinks: any[] = Array.isArray(meta.outputStereoLinks)
			? meta.outputStereoLinks
			: [];

		// Insert items
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			await db.run(
				`INSERT INTO plot_items (id, plot_id, name, type, category, current_variant, pos_x, pos_y, width, height, rotation, person_id, item_data, sort_order, size)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					item.id,
					plot.id,
					item.name ?? '',
					item.type ?? 'input',
					item.itemData?.category ?? item.category ?? null,
					item.currentVariant ?? 'default',
					item.position?.x ?? 0,
					item.position?.y ?? 0,
					item.position?.width ?? 0,
					item.position?.height ?? 0,
					item.position?.rotation ?? 0,
					item.person_id ?? null,
					item.itemData ? JSON.stringify(item.itemData) : null,
					i,
					item.size ?? null
				]
			);
		}

		// Insert outputs
		for (const output of outputs) {
			await db.run(
				`INSERT INTO plot_outputs (id, plot_id, name, link_mode, item_data)
				 VALUES (?, ?, ?, ?, ?)`,
				[
					output.id,
					plot.id,
					output.name ?? '',
					output.link_mode ?? 'mono',
					output.itemData ? JSON.stringify(output.itemData) : null
				]
			);
		}

		// Insert input channels
		for (const ch of inputChannels) {
			await db.run(
				`INSERT INTO plot_input_channels (plot_id, channel_num, item_id, color, name, short_name, phantom)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[
					plot.id,
					ch.channelNum,
					ch.itemId ?? null,
					ch.color ?? null,
					ch.name ?? null,
					ch.shortName ?? null,
					ch.phantom ? 1 : 0
				]
			);
		}

		// Insert output channels
		for (const ch of outputChannels) {
			await db.run(
				`INSERT INTO plot_output_channels (plot_id, channel_num, output_id)
				 VALUES (?, ?, ?)`,
				[plot.id, ch.channelNum, ch.outputId ?? null]
			);
		}

		// Move outputStereoLinks to column
		if (outputStereoLinks.length > 0) {
			await db.run('UPDATE stage_plots SET output_stereo_links = ? WHERE id = ?', [
				JSON.stringify(outputStereoLinks),
				plot.id
			]);
		}

		// Strip migrated fields from metadata, keep only coordVersion + undo/redo
		const slimMeta: any = {};
		if (meta.coordVersion != null) slimMeta.coordVersion = meta.coordVersion;
		if (Array.isArray(meta.undoLog)) slimMeta.undoLog = meta.undoLog;
		if (Array.isArray(meta.redoStack)) slimMeta.redoStack = meta.redoStack;

		await db.run('UPDATE stage_plots SET metadata = ? WHERE id = ?', [
			JSON.stringify(slimMeta),
			plot.id
		]);
	}

	// --- Cleanup legacy tables ---
	await db.exec('DROP TABLE IF EXISTS items');
	await db.exec('DROP TABLE IF EXISTS musicians');
}
