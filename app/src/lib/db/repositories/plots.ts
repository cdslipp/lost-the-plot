// SPDX-License-Identifier: AGPL-3.0-only
import { db } from '$lib/db';

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
}

export async function getPlotsByBandId(bandId: string): Promise<PlotSummary[]> {
	return db.query<PlotSummary>(
		'SELECT id, name, revision_date, event_name FROM stage_plots WHERE band_id = ? AND COALESCE(is_template, 0) = 0 ORDER BY updated_at DESC',
		[bandId]
	);
}

export async function getFullPlotsByBandId(bandId: string): Promise<PlotRow[]> {
	return db.query<PlotRow>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata,
			stage_width, stage_depth, event_name, event_date, event_time, venue
		 FROM stage_plots WHERE band_id = ?`,
		[bandId]
	);
}

export async function getAllPlotsForExport(): Promise<PlotRow[]> {
	return db.query<PlotRow>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata,
			band_id, event_name, event_date, event_time, venue
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
			opts.metadata ?? JSON.stringify({ items: [], musicians: [] }),
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
	}
): Promise<void> {
	await db.run(
		`INSERT OR REPLACE INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
			data.category_color_defaults
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

export async function duplicatePlot(plotId: string, bandId: string): Promise<string> {
	const plot = await getPlotById(plotId);
	if (!plot) throw new Error('Plot not found');
	const newId = crypto.randomUUID().replace(/-/g, '');
	await db.run(
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, event_name, event_date, event_time, venue)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
			plot.event_name ?? null,
			plot.event_date ?? null,
			plot.event_time ?? null,
			plot.venue ?? null
		]
	);
	return newId;
}

export async function createTemplateFromPlot(plotId: string, bandId: string): Promise<string> {
	const plot = await getPlotById(plotId);
	if (!plot) throw new Error('Plot not found');
	const newId = crypto.randomUUID().replace(/-/g, '');
	await db.run(
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, is_template, source_plot_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
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
			plotId
		]
	);
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
		`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults, source_plot_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
			templateId
		]
	);
	return newId;
}
