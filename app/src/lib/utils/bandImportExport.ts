// SPDX-License-Identifier: AGPL-3.0-only

import { db } from '$lib/db';
import { insertPersonsForBand } from '$lib/db/repositories/persons';
import { getStageArea, type CanvasConfig } from '$lib/utils/paperConfig';
import { isTauri } from '$lib/utils/platform';
import { generateId } from '@stageplotter/shared';

declare const __APP_VERSION__: string;
const APP_VERSION = __APP_VERSION__;

// --- Helpers ---

export function safeSlug(value: string): string {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)+/g, '') || 'lost-the-plot'
	);
}

function buildCanvasConfig(
	width?: number,
	height?: number
): CanvasConfig & { width: number; height: number } {
	const safeWidth = width && width > 0 ? width : 1100;
	const safeHeight = height && height > 0 ? height : 850;
	const orientation = safeWidth >= safeHeight ? 'landscape' : 'portrait';
	return { format: 'letter', orientation, dpi: 96, width: safeWidth, height: safeHeight };
}

function getPlatformLabel(): string {
	if (!isTauri()) return 'web';
	if (typeof navigator === 'undefined') return 'tauri-desktop';
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes('windows')) return 'tauri-windows';
	if (ua.includes('mac os') || ua.includes('macintosh')) return 'tauri-macos';
	if (ua.includes('linux')) return 'tauri-linux';
	return 'tauri-desktop';
}

function buildFileMetadata() {
	const now = new Date().toISOString();
	return {
		created_at: now,
		modified_at: now,
		created_by: {
			app: 'Lost the Plot',
			version: APP_VERSION,
			platform: getPlatformLabel()
		}
	};
}

// --- Import ---

export function normalizeProjects(data: any): any[] {
	if (!data) return [];
	if (Array.isArray(data)) return data;
	if (data.type === 'band_project_bundle' && Array.isArray(data.projects)) return data.projects;
	if (data.type === 'band_project') return [data];
	return [];
}

function buildMusicians(players: any[]) {
	return players.map((player: any, index: number) => ({
		id: index + 1,
		name: player.person?.name ?? 'Unknown Musician',
		instrument: ''
	}));
}

function buildItemsFromPlaced(
	placedItems: any[],
	itemCatalog: Map<string, any>,
	playerById: Map<string, string>
) {
	const baseId = Date.now();
	return placedItems.map((placed: any, index: number) => {
		const catalogItem = itemCatalog.get(placed.item_id);
		const name = catalogItem?.name ?? 'Untitled Item';
		const itemData = catalogItem?.catalog_snapshot ?? undefined;
		const type = itemData?.type ?? catalogItem?.category ?? 'input';
		const musician = playerById.get(placed.player_id) ?? '';
		const pos = placed.position ?? {};
		return {
			id: baseId + index + 1,
			type,
			itemData,
			currentVariant: placed.current_variant ?? 'default',
			position: {
				x: pos.x ?? 0,
				y: pos.y ?? 0,
				width: pos.width ?? 0,
				height: pos.height ?? 0,
				zone: pos.zone,
				relativeX: pos.relativeX,
				relativeY: pos.relativeY
			},
			name,
			channel: '',
			musician
		};
	});
}

async function importTours(bandId: string, tours: any[]): Promise<void> {
	for (const tour of tours) {
		const tourId = generateId();
		await db.run(
			'INSERT INTO tours (id, band_id, name, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)',
			[
				tourId,
				bandId,
				tour.name ?? 'Untitled Tour',
				tour.start_date ?? null,
				tour.end_date ?? null,
				tour.notes ?? null
			]
		);

		// Re-assign gigs to tour by matching gig names
		if (Array.isArray(tour.gig_names)) {
			for (const gigName of tour.gig_names) {
				await db.run(
					"UPDATE gigs SET tour_id = ?, updated_at = datetime('now') WHERE band_id = ? AND name = ? AND tour_id IS NULL",
					[tourId, bandId, gigName]
				);
			}
		}
	}
}

export async function importBandProject(project: any, existingIds: Set<string>): Promise<void> {
	if (!project || project.type !== 'band_project') return;
	const sourceBand = project.band ?? {};
	let bandId = sourceBand.id ?? generateId();
	if (existingIds.has(bandId)) {
		bandId = generateId();
	}
	existingIds.add(bandId);
	const bandName = sourceBand.name ?? 'Imported Band';
	await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [bandId, bandName]);

	const players = Array.isArray(sourceBand.players) ? sourceBand.players : [];
	const contacts = Array.isArray(sourceBand.contacts) ? sourceBand.contacts : [];
	await insertPersonsForBand(bandId, [
		...players.map((player: any) => {
			const person = player.person ?? {};
			return {
				name: person.name ?? 'Unknown Musician',
				role: null,
				pronouns: person.pronouns ?? null,
				phone: person.phone ?? null,
				email: person.email ?? null,
				member_type: 'performer',
				status: 'permanent'
			};
		}),
		...contacts.map((contact: any) => ({
			name: contact.name ?? 'Unknown Contact',
			role: contact.role ?? null,
			pronouns: contact.pronouns ?? null,
			phone: contact.phone ?? null,
			email: contact.email ?? null,
			member_type: 'crew',
			status: 'permanent'
		}))
	]);

	const itemCatalog = new Map<string, any>();
	const sourceItems = Array.isArray(sourceBand.items) ? sourceBand.items : [];
	for (const item of sourceItems) {
		if (item?.id) itemCatalog.set(item.id, item);
	}

	const playerById = new Map<string, string>();
	for (const player of players) {
		if (player?.id && player?.person?.name) {
			playerById.set(player.id, player.person.name);
		}
	}

	const musicians = buildMusicians(players);
	const plots = Array.isArray(project.plots) ? project.plots : [];
	for (const plot of plots) {
		const plotId = generateId();
		const placedItems = Array.isArray(plot.placed_items) ? plot.placed_items : [];
		const items = buildItemsFromPlaced(placedItems, itemCatalog, playerById);
		const metadata = { items, musicians };

		const canvasWidth = plot.canvas?.width ?? 1100;
		const canvasHeight = plot.canvas?.height ?? 850;
		await db.run(
			`INSERT INTO stage_plots
				(id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, event_name, event_date, event_time, venue)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				plotId,
				plot.plot_name ?? 'Imported Plot',
				plot.revision_date ?? new Date().toISOString().split('T')[0],
				canvasWidth,
				canvasHeight,
				JSON.stringify(metadata),
				bandId,
				24,
				16,
				plot.event?.name ?? null,
				plot.event?.date ?? null,
				plot.event?.time ?? null,
				plot.event?.venue ?? null
			]
		);
	}

	// Import tours
	const tours = Array.isArray(project.tours) ? project.tours : [];
	if (tours.length > 0) {
		await importTours(bandId, tours);
	}
}

// --- Export ---

interface ExportPerson {
	id: number;
	band_id: string;
	name: string;
	role: string | null;
	pronouns: string | null;
	phone: string | null;
	email: string | null;
	member_type: string | null;
	status: string | null;
}

interface ExportPlot {
	id: string;
	name: string;
	revision_date: string;
	canvas_width: number;
	canvas_height: number;
	metadata: string | null;
	band_id: string;
	event_name: string | null;
	event_date: string | null;
	event_time: string | null;
	venue: string | null;
}

interface ExportTour {
	id: string;
	band_id: string;
	name: string;
	start_date: string | null;
	end_date: string | null;
	notes: string | null;
}

export function buildBandProject(
	band: { id: string; name: string },
	bandPersons: ExportPerson[],
	bandPlots: ExportPlot[],
	bandTours: ExportTour[] = []
) {
	const bandPeople = bandPersons.filter((p) => p.status !== 'inactive');
	const players = bandPeople
		.filter((p) => p.member_type === 'performer')
		.map((p) => ({
			id: `player-${p.id}`,
			person: {
				name: p.name,
				pronouns: p.pronouns ?? undefined,
				phone: p.phone ?? undefined,
				email: p.email ?? undefined
			},
			item_ids: [],
			output_ids: []
		}));

	const contacts = bandPeople
		.filter((p) => p.member_type !== 'performer')
		.map((p) => ({
			name: p.name,
			role: p.role ?? undefined,
			pronouns: p.pronouns ?? undefined,
			phone: p.phone ?? undefined,
			email: p.email ?? undefined
		}));

	const itemIdMap = new Map<number, string>();
	const bandItems: any[] = [];

	function registerItem(rawItem: any) {
		if (!rawItem || typeof rawItem.id !== 'number') return;
		if (!itemIdMap.has(rawItem.id)) {
			const fileId = `item-${rawItem.id}`;
			itemIdMap.set(rawItem.id, fileId);
			bandItems.push({
				id: fileId,
				name: rawItem.name || rawItem.itemData?.name || 'Untitled Item',
				category: rawItem.itemData?.category ?? rawItem.itemData?.type ?? rawItem.type,
				catalog_snapshot: rawItem.itemData ?? undefined
			});
		}
	}

	// Build a name→player lookup so placed_items mapping is O(1) instead of O(players) per item
	const playerByName = new Map<string, (typeof players)[number]>();
	for (const p of players) {
		playerByName.set(p.person.name, p);
	}

	const plots = bandPlots.map((plot, plotIndex) => {
		let meta: any = {};
		if (plot.metadata) {
			try {
				meta = JSON.parse(plot.metadata);
			} catch {
				meta = {};
			}
		}

		const items = Array.isArray(meta.items) ? meta.items : [];
		const canvasConfig = buildCanvasConfig(plot.canvas_width, plot.canvas_height);
		const stage = getStageArea({ width: canvasConfig.width, height: canvasConfig.height });

		const placed_items = items.map((item: any, index: number) => {
			registerItem(item);
			const player = item.musician ? playerByName.get(item.musician) : undefined;
			return {
				item_id: itemIdMap.get(item.id) ?? `item-${item.id}`,
				current_variant: item.currentVariant ?? 'default',
				position: {
					x: item.position?.x ?? item.x ?? 0,
					y: item.position?.y ?? item.y ?? 0,
					width: item.position?.width ?? item.width ?? 0,
					height: item.position?.height ?? item.height ?? 0,
					zone: item.position?.zone,
					relativeX: item.position?.relativeX,
					relativeY: item.position?.relativeY
				},
				rotation: 0,
				sort_order: index,
				player_id: player?.id
			};
		});

		return {
			id: `plot-${plot.id}`,
			plot_name: plot.name,
			revision_date: plot.revision_date,
			is_default: plotIndex === 0,
			canvas: canvasConfig,
			stage,
			placed_items,
			event:
				plot.event_name || plot.event_date || plot.event_time || plot.venue
					? {
							name: plot.event_name ?? undefined,
							date: plot.event_date ?? undefined,
							time: plot.event_time ?? undefined,
							venue: plot.venue ?? undefined
						}
					: undefined,
			metadata: {}
		};
	});

	return {
		$schema: 'https://stageplotter.com/schemas/stageplot-1.0.0.json',
		format_version: '1.0.0',
		type: 'band_project',
		file_metadata: buildFileMetadata(),
		band: {
			id: band.id,
			name: band.name,
			players,
			contacts,
			items: bandItems,
			inputs: [],
			channels: [],
			outputs: [],
			monitor_mixes: []
		},
		plots,
		tours: bandTours.map((t) => ({
			name: t.name,
			start_date: t.start_date,
			end_date: t.end_date,
			notes: t.notes
		}))
	};
}

function downloadJson(data: any, filename: string) {
	const dataStr = JSON.stringify(data, null, 2);
	const dataBlob = new Blob([dataStr], { type: 'application/json' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(dataBlob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

export async function exportBand(bandId: string): Promise<void> {
	const band = await db.queryOne<{ id: string; name: string }>(
		'SELECT id, name FROM bands WHERE id = ?',
		[bandId]
	);
	if (!band) return;

	const bandPersons = await db.query<ExportPerson>(
		'SELECT id, band_id, name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ?',
		[bandId]
	);
	const bandPlots = await db.query<ExportPlot>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata, band_id, event_name, event_date, event_time, venue
		 FROM stage_plots WHERE band_id = ? ORDER BY updated_at DESC`,
		[bandId]
	);

	const bandTours = await db.query<ExportTour>(
		'SELECT id, band_id, name, start_date, end_date, notes FROM tours WHERE band_id = ?',
		[bandId]
	);

	const project = buildBandProject(band, bandPersons, bandPlots, bandTours);
	const timestamp = new Date().toISOString().split('T')[0];
	downloadJson(project, `${safeSlug(band.name)}-${timestamp}.json`);
}

export async function exportAllBands(): Promise<void> {
	const allBands = await db.query<{
		id: string;
		name: string;
		created_at: string;
		updated_at: string;
	}>('SELECT id, name, created_at, updated_at FROM bands ORDER BY updated_at DESC');

	const allPersons = await db.query<ExportPerson>(
		'SELECT id, band_id, name, role, pronouns, phone, email, member_type, status FROM persons'
	);

	const allPlots = await db.query<ExportPlot>(
		`SELECT id, name, revision_date, canvas_width, canvas_height, metadata, band_id, event_name, event_date, event_time, venue
		 FROM stage_plots ORDER BY updated_at DESC`
	);

	// Group by band_id in a single pass instead of O(bands * (persons + plots)) filtering
	const personsByBand = new Map<string, ExportPerson[]>();
	for (const p of allPersons) {
		let arr = personsByBand.get(p.band_id);
		if (!arr) {
			arr = [];
			personsByBand.set(p.band_id, arr);
		}
		arr.push(p);
	}
	const plotsByBand = new Map<string, ExportPlot[]>();
	for (const plot of allPlots) {
		let arr = plotsByBand.get(plot.band_id);
		if (!arr) {
			arr = [];
			plotsByBand.set(plot.band_id, arr);
		}
		arr.push(plot);
	}

	const allTours = await db.query<ExportTour>(
		'SELECT id, band_id, name, start_date, end_date, notes FROM tours'
	);
	const toursByBand = new Map<string, ExportTour[]>();
	for (const tour of allTours) {
		let arr = toursByBand.get(tour.band_id);
		if (!arr) {
			arr = [];
			toursByBand.set(tour.band_id, arr);
		}
		arr.push(tour);
	}

	const projects = allBands.map((band) => {
		return buildBandProject(
			band,
			personsByBand.get(band.id) ?? [],
			plotsByBand.get(band.id) ?? [],
			toursByBand.get(band.id) ?? []
		);
	});

	const bundle = {
		format_version: '1.0.0',
		type: 'band_project_bundle',
		exported_at: new Date().toISOString(),
		projects
	};

	const timestamp = new Date().toISOString().split('T')[0];
	downloadJson(bundle, `${safeSlug('all-bands')}-${timestamp}.json`);
}

export async function handleImportFile(file: File): Promise<void> {
	await db.init();
	const text = await file.text();
	const data = JSON.parse(text);
	const projects = normalizeProjects(data);
	if (!projects.length) throw new Error('No band projects found in file.');

	const existing = await db.query<{ id: string }>('SELECT id FROM bands');
	const existingIds = new Set(existing.map((row) => row.id));
	for (const project of projects) {
		await importBandProject(project, existingIds);
	}
}
