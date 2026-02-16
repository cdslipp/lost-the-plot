// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';
import { runInTransaction, insertMany } from '$lib/db/batch';

export interface PlotSummary {
	id: string;
	name: string;
	revision_date?: string;
	event_name?: string;
}

export interface PlotRow {
	id: string;
	name: string;
	revision_date: string;
	canvas_width: number;
	canvas_height: number;
	metadata: string;
	band_id: string;
	stage_width: number;
	stage_depth: number;
	console_type?: string | null;
	channel_colors?: string | null;
	stereo_links?: string | null;
	category_color_defaults?: string | null;
	event_name?: string | null;
	event_date?: string | null;
	event_time?: string | null;
	venue?: string | null;
	output_stereo_links?: string | null;
}

// --- Row types for normalized tables ---

export interface PlotItemRow {
	id: number;
	plot_id: string;
	name: string;
	type: string;
	category: string | null;
	current_variant: string;
	pos_x: number;
	pos_y: number;
	width: number;
	height: number;
	rotation: number;
	person_id: number | null;
	item_data: string | null;
	sort_order: number;
	size: string | null;
}

export interface PlotOutputRow {
	id: number;
	plot_id: string;
	name: string;
	link_mode: string;
	item_data: string | null;
}

export interface PlotInputChannelRow {
	plot_id: string;
	channel_num: number;
	item_id: number | null;
	color: string | null;
	name: string | null;
	short_name: string | null;
	phantom: number;
}

export interface PlotOutputChannelRow {
	plot_id: string;
	channel_num: number;
	output_id: number | null;
}

// --- Entity queries ---

export async function getPlotItems(plotId: string): Promise<PlotItemRow[]> {
	return db.query<PlotItemRow>('SELECT * FROM plot_items WHERE plot_id = ? ORDER BY sort_order', [
		plotId
	]);
}

export async function getPlotOutputs(plotId: string): Promise<PlotOutputRow[]> {
	return db.query<PlotOutputRow>('SELECT * FROM plot_outputs WHERE plot_id = ?', [plotId]);
}

export async function getPlotInputChannels(plotId: string): Promise<PlotInputChannelRow[]> {
	return db.query<PlotInputChannelRow>(
		'SELECT * FROM plot_input_channels WHERE plot_id = ? ORDER BY channel_num',
		[plotId]
	);
}

export async function getPlotOutputChannels(plotId: string): Promise<PlotOutputChannelRow[]> {
	return db.query<PlotOutputChannelRow>(
		'SELECT * FROM plot_output_channels WHERE plot_id = ? ORDER BY channel_num',
		[plotId]
	);
}

// --- Save entities (DELETE + batch INSERT in transaction) ---

export async function savePlotEntities(
	plotId: string,
	entities: {
		items: PlotItemRow[];
		outputs: PlotOutputRow[];
		inputChannels: PlotInputChannelRow[];
		outputChannels: PlotOutputChannelRow[];
	}
): Promise<void> {
	await runInTransaction(async () => {
		// Delete existing
		await db.run('DELETE FROM plot_items WHERE plot_id = ?', [plotId]);
		await db.run('DELETE FROM plot_outputs WHERE plot_id = ?', [plotId]);
		await db.run('DELETE FROM plot_input_channels WHERE plot_id = ?', [plotId]);
		await db.run('DELETE FROM plot_output_channels WHERE plot_id = ?', [plotId]);

		// Insert items
		if (entities.items.length > 0) {
			await insertMany(
				'plot_items',
				[
					'id',
					'plot_id',
					'name',
					'type',
					'category',
					'current_variant',
					'pos_x',
					'pos_y',
					'width',
					'height',
					'rotation',
					'person_id',
					'item_data',
					'sort_order',
					'size'
				],
				entities.items.map((i) => [
					i.id,
					i.plot_id,
					i.name,
					i.type,
					i.category,
					i.current_variant,
					i.pos_x,
					i.pos_y,
					i.width,
					i.height,
					i.rotation,
					i.person_id,
					i.item_data,
					i.sort_order,
					i.size
				])
			);
		}

		// Insert outputs
		if (entities.outputs.length > 0) {
			await insertMany(
				'plot_outputs',
				['id', 'plot_id', 'name', 'link_mode', 'item_data'],
				entities.outputs.map((o) => [o.id, o.plot_id, o.name, o.link_mode, o.item_data])
			);
		}

		// Insert input channels
		if (entities.inputChannels.length > 0) {
			await insertMany(
				'plot_input_channels',
				['plot_id', 'channel_num', 'item_id', 'color', 'name', 'short_name', 'phantom'],
				entities.inputChannels.map((ch) => [
					ch.plot_id,
					ch.channel_num,
					ch.item_id,
					ch.color,
					ch.name,
					ch.short_name,
					ch.phantom
				])
			);
		}

		// Insert output channels
		if (entities.outputChannels.length > 0) {
			await insertMany(
				'plot_output_channels',
				['plot_id', 'channel_num', 'output_id'],
				entities.outputChannels.map((ch) => [ch.plot_id, ch.channel_num, ch.output_id])
			);
		}
	});
}

// --- Plot CRUD ---

export async function getPlotsByBandId(bandId: string): Promise<PlotSummary[]> {
	return db.query<PlotSummary>(
		'SELECT id, name, revision_date, event_name FROM stage_plots WHERE band_id = ? AND COALESCE(is_template, 0) = 0 ORDER BY updated_at DESC',
		[bandId]
	);
}

export async function getFullPlotsByBandId(bandId: string): Promise<PlotRow[]> {
	return db.query<PlotRow>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata,
			stage_width, stage_depth, event_name, event_date, event_time, venue, output_stereo_links
		 FROM stage_plots WHERE band_id = ?`,
		[bandId]
	);
}

export async function getAllPlotsForExport(): Promise<PlotRow[]> {
	return db.query<PlotRow>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata,
			band_id, event_name, event_date, event_time, venue, output_stereo_links
		 FROM stage_plots ORDER BY updated_at DESC`
	);
}

export async function getPlotById(plotId: string): Promise<PlotRow | null> {
	return db.queryOne<PlotRow>('SELECT * FROM stage_plots WHERE id = ?', [plotId]);
}

export async function createPlot(
	id: string,
	name: string,
	bandId: string,
	opts: Partial<Omit<PlotRow, 'id' | 'name' | 'band_id'>> & { metadata?: string } = {}
): Promise<void> {
	await db.run(
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, event_name, event_date, event_time, venue)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			id,
			name,
			opts.revision_date ?? new Date().toISOString().split('T')[0],
			opts.canvas_width ?? 1100,
			opts.canvas_height ?? 850,
			opts.metadata ?? JSON.stringify({}),
			bandId,
			opts.stage_width ?? 24,
			opts.stage_depth ?? 16,
			opts.event_name ?? null,
			opts.event_date ?? null,
			opts.event_time ?? null,
			opts.venue ?? null
		]
	);
}

export async function upsertPlot(
	plotId: string,
	bandId: string,
	data: {
		name: string;
		revision_date: string;
		canvas_width: number;
		canvas_height: number;
		metadata: string;
		stage_width: number;
		stage_depth: number;
		console_type: string | null;
		channel_colors: string;
		stereo_links: string;
		category_color_defaults: string;
		output_stereo_links: string;
	}
): Promise<void> {
	await db.run(
		`INSERT OR REPLACE INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, output_stereo_links)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			plotId,
			data.name,
			data.revision_date,
			data.canvas_width,
			data.canvas_height,
			data.metadata,
			bandId,
			data.stage_width,
			data.stage_depth,
			data.console_type,
			data.channel_colors,
			data.stereo_links,
			data.category_color_defaults,
			data.output_stereo_links
		]
	);
}

export async function deletePlot(plotId: string): Promise<void> {
	await db.run('DELETE FROM stage_plots WHERE id = ?', [plotId]);
}

export interface PlotWithBand {
	id: string;
	name: string;
	band_id: string;
	band_name: string;
}

export async function getAllPlotsWithBandName(): Promise<PlotWithBand[]> {
	return db.query<PlotWithBand>(
		`SELECT sp.id, sp.name, sp.band_id, b.name as band_name
		 FROM stage_plots sp JOIN bands b ON sp.band_id = b.id
		 ORDER BY b.updated_at DESC, sp.updated_at DESC`
	);
}

export async function deletePlotsByBandId(bandId: string): Promise<void> {
	await db.run('DELETE FROM stage_plots WHERE band_id = ?', [bandId]);
}

async function copyPlotEntities(sourceId: string, targetId: string): Promise<void> {
	await db.run(
		`INSERT INTO plot_items (id, plot_id, name, type, category, current_variant, pos_x, pos_y, width, height, rotation, person_id, item_data, sort_order, size)
		 SELECT id, ?, name, type, category, current_variant, pos_x, pos_y, width, height, rotation, person_id, item_data, sort_order, size
		 FROM plot_items WHERE plot_id = ?`,
		[targetId, sourceId]
	);
	await db.run(
		`INSERT INTO plot_outputs (id, plot_id, name, link_mode, item_data)
		 SELECT id, ?, name, link_mode, item_data
		 FROM plot_outputs WHERE plot_id = ?`,
		[targetId, sourceId]
	);
	await db.run(
		`INSERT INTO plot_input_channels (plot_id, channel_num, item_id, color, name, short_name, phantom)
		 SELECT ?, channel_num, item_id, color, name, short_name, phantom
		 FROM plot_input_channels WHERE plot_id = ?`,
		[targetId, sourceId]
	);
	await db.run(
		`INSERT INTO plot_output_channels (plot_id, channel_num, output_id)
		 SELECT ?, channel_num, output_id
		 FROM plot_output_channels WHERE plot_id = ?`,
		[targetId, sourceId]
	);
}

export async function duplicatePlot(plotId: string, bandId: string): Promise<string> {
	const plot = await getPlotById(plotId);
	if (!plot) throw new Error('Plot not found');
	const newId = crypto.randomUUID().replace(/-/g, '');
	await db.run(
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, output_stereo_links, event_name, event_date, event_time, venue)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			newId,
			`${plot.name} (Copy)`,
			new Date().toISOString().split('T')[0],
			plot.canvas_width,
			plot.canvas_height,
			plot.metadata,
			bandId,
			plot.stage_width,
			plot.stage_depth,
			plot.console_type ?? null,
			plot.channel_colors ?? null,
			plot.stereo_links ?? null,
			plot.category_color_defaults ?? null,
			plot.output_stereo_links ?? null,
			plot.event_name ?? null,
			plot.event_date ?? null,
			plot.event_time ?? null,
			plot.venue ?? null
		]
	);
	await copyPlotEntities(plotId, newId);
	return newId;
}

export async function createTemplateFromPlot(plotId: string, bandId: string): Promise<string> {
	const plot = await getPlotById(plotId);
	if (!plot) throw new Error('Plot not found');
	const newId = crypto.randomUUID().replace(/-/g, '');
	await db.run(
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, output_stereo_links, is_template, source_plot_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
		[
			newId,
			`${plot.name} (Template)`,
			new Date().toISOString().split('T')[0],
			plot.canvas_width,
			plot.canvas_height,
			plot.metadata,
			bandId,
			plot.stage_width,
			plot.stage_depth,
			plot.console_type ?? null,
			plot.channel_colors ?? null,
			plot.stereo_links ?? null,
			plot.category_color_defaults ?? null,
			plot.output_stereo_links ?? null,
			plotId
		]
	);
	await copyPlotEntities(plotId, newId);
	return newId;
}

export async function getTemplates(bandId: string): Promise<PlotSummary[]> {
	return db.query<PlotSummary>(
		'SELECT id, name, revision_date, event_name FROM stage_plots WHERE band_id = ? AND is_template = 1 ORDER BY updated_at DESC',
		[bandId]
	);
}

export async function createPlotFromTemplate(templateId: string, bandId: string): Promise<string> {
	const template = await getPlotById(templateId);
	if (!template) throw new Error('Template not found');
	const newId = crypto.randomUUID().replace(/-/g, '');
	await db.run(
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, output_stereo_links, source_plot_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			newId,
			template.name.replace(' (Template)', ''),
			new Date().toISOString().split('T')[0],
			template.canvas_width,
			template.canvas_height,
			template.metadata,
			bandId,
			template.stage_width,
			template.stage_depth,
			template.console_type ?? null,
			template.channel_colors ?? null,
			template.stereo_links ?? null,
			template.category_color_defaults ?? null,
			template.output_stereo_links ?? null,
			templateId
		]
	);
	await copyPlotEntities(templateId, newId);
	return newId;
}
