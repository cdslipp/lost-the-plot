<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { getStageArea, type CanvasConfig } from '$lib/utils/canvas';
	import { isTauri } from '$lib/platform';
	const APP_VERSION = __APP_VERSION__;

	let bands = $state<{ id: string; name: string; created_at: string; plot_count: number }[]>([]);
	let loading = $state(true);
	let exporting = $state(false);
	let importing = $state(false);
	let openMenuBandId = $state<string | null>(null);
	let editingBandId = $state<string | null>(null);
	let bandNameInput = $state('');
	let fileInput: HTMLInputElement;

	async function loadBands() {
		await db.init();
		const rows = await db.query<{
			id: string;
			name: string;
			created_at: string;
			plot_count: number;
		}>(`
			SELECT b.id, b.name, b.created_at,
				(SELECT COUNT(*) FROM stage_plots WHERE band_id = b.id) as plot_count
			FROM bands b
			ORDER BY b.updated_at DESC
		`);
		bands = rows;
		loading = false;
	}

	async function createBand() {
		await db.init();
		const id = crypto.randomUUID().replace(/-/g, '');
		await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [id, 'Untitled Band']);
		goto(`/bands/${id}`);
	}

	async function deleteBand(bandId: string, bandName: string) {
		openMenuBandId = null;
		const confirmed = confirm(
			`Delete "${bandName}"? This removes all plots, people, songs, gigs, and setlists.`
		);
		if (!confirmed) return;
		await db.init();
		await db.run(
			`DELETE FROM setlist_songs WHERE setlist_id IN (
				SELECT id FROM setlists WHERE gig_id IN (SELECT id FROM gigs WHERE band_id = ?)
			)`,
			[bandId]
		);
		await db.run(
			`DELETE FROM setlists WHERE gig_id IN (SELECT id FROM gigs WHERE band_id = ?)`,
			[bandId]
		);
		await db.run('DELETE FROM gigs WHERE band_id = ?', [bandId]);
		await db.run('DELETE FROM songs WHERE band_id = ?', [bandId]);
		await db.run('DELETE FROM persons WHERE band_id = ?', [bandId]);
		await db.run('DELETE FROM stage_plots WHERE band_id = ?', [bandId]);
		await db.run('DELETE FROM bands WHERE id = ?', [bandId]);
		await loadBands();
	}

	function startRenameBand(band: { id: string; name: string }) {
		editingBandId = band.id;
		bandNameInput = band.name;
		openMenuBandId = null;
	}

	function cancelRenameBand() {
		editingBandId = null;
		bandNameInput = '';
	}

	async function saveBandName(bandId: string) {
		const nextName = bandNameInput.trim();
		if (!nextName) return;
		await db.init();
		await db.run("UPDATE bands SET name = ?, updated_at = datetime('now') WHERE id = ?", [
			nextName,
			bandId
		]);
		editingBandId = null;
		bandNameInput = '';
		await loadBands();
	}

	async function duplicateBand(bandId: string) {
		openMenuBandId = null;
		await db.init();
		const sourceBand = await db.queryOne<{ id: string; name: string }>(
			'SELECT id, name FROM bands WHERE id = ?',
			[bandId]
		);
		if (!sourceBand) return;
		const newBandId = crypto.randomUUID().replace(/-/g, '');
		const newBandName = `${sourceBand.name} Copy`;
		await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [newBandId, newBandName]);

		const persons = await db.query<{
			name: string;
			role: string | null;
			pronouns: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}>(
			'SELECT name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ?',
			[bandId]
		);
		for (const person of persons) {
			await db.run(
				'INSERT INTO persons (band_id, name, role, pronouns, phone, email, member_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				[
					newBandId,
					person.name,
					person.role,
					person.pronouns,
					person.phone,
					person.email,
					person.member_type,
					person.status
				]
			);
		}

		const songs = await db.query<{
			id: number;
			title: string;
			starting_key: string | null;
			starting_tempo: number | null;
			instruments: string | null;
			notes: string | null;
			starred: number | null;
		}>(
			'SELECT id, title, starting_key, starting_tempo, instruments, notes, starred FROM songs WHERE band_id = ?',
			[bandId]
		);
		const songIdMap = new Map<number, number>();
		for (const song of songs) {
			const result = await db.run(
				'INSERT INTO songs (band_id, title, starting_key, starting_tempo, instruments, notes, starred) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[
					newBandId,
					song.title,
					song.starting_key,
					song.starting_tempo,
					song.instruments,
					song.notes,
					song.starred ?? 0
				]
			);
			songIdMap.set(song.id, result.lastInsertRowid);
		}

		const plots = await db.query<{
			id: string;
			name: string;
			revision_date: string;
			canvas_width: number;
			canvas_height: number;
			metadata: string | null;
			stage_width: number | null;
			stage_depth: number | null;
			event_name: string | null;
			event_date: string | null;
			event_time: string | null;
			venue: string | null;
		}>(
			`SELECT id, name, revision_date, canvas_width, canvas_height, metadata, stage_width, stage_depth, event_name, event_date, event_time, venue
			 FROM stage_plots WHERE band_id = ?`,
			[bandId]
		);
		const plotIdMap = new Map<string, string>();
		for (const plot of plots) {
			const newPlotId = crypto.randomUUID().replace(/-/g, '');
			plotIdMap.set(plot.id, newPlotId);
			await db.run(
				`INSERT INTO stage_plots
					(id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, event_name, event_date, event_time, venue)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					newPlotId,
					plot.name,
					plot.revision_date,
					plot.canvas_width,
					plot.canvas_height,
					plot.metadata,
					newBandId,
					plot.stage_width,
					plot.stage_depth,
					plot.event_name,
					plot.event_date,
					plot.event_time,
					plot.venue
				]
			);
		}

		if (plots.length > 0) {
			const plotIds = plots.map((plot) => plot.id);
			const plotPlaceholders = plotIds.map(() => '?').join(',');
			const items = await db.query<{
				plot_id: string;
				name: string;
				type: string;
				category: string | null;
				current_variant: string | null;
				pos_x: number;
				pos_y: number;
				width: number;
				height: number;
				channel: string | null;
				musician: string | null;
				item_data: string | null;
				sort_order: number | null;
			}>(
				`SELECT plot_id, name, type, category, current_variant, pos_x, pos_y, width, height, channel, musician, item_data, sort_order
				 FROM items WHERE plot_id IN (${plotPlaceholders})`,
				plotIds
			);
			for (const item of items) {
				const newPlotId = plotIdMap.get(item.plot_id);
				if (!newPlotId) continue;
				await db.run(
					`INSERT INTO items
						(plot_id, name, type, category, current_variant, pos_x, pos_y, width, height, channel, musician, item_data, sort_order)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						newPlotId,
						item.name,
						item.type,
						item.category,
						item.current_variant,
						item.pos_x,
						item.pos_y,
						item.width,
						item.height,
						item.channel,
						item.musician,
						item.item_data,
						item.sort_order
					]
				);
			}

			const musicians = await db.query<{
				plot_id: string;
				name: string;
				instrument: string | null;
			}>(
				`SELECT plot_id, name, instrument FROM musicians WHERE plot_id IN (${plotPlaceholders})`,
				plotIds
			);
			for (const musician of musicians) {
				const newPlotId = plotIdMap.get(musician.plot_id);
				if (!newPlotId) continue;
				await db.run(
					'INSERT INTO musicians (plot_id, name, instrument) VALUES (?, ?, ?)',
					[newPlotId, musician.name, musician.instrument]
				);
			}
		}

		const gigs = await db.query<{
			id: number;
			name: string;
			venue: string | null;
			date: string | null;
			time: string | null;
			set_time: string | null;
			changeover_minutes: number | null;
			plot_id: string | null;
			notes: string | null;
		}>(
			'SELECT id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes FROM gigs WHERE band_id = ?',
			[bandId]
		);
		const gigIdMap = new Map<number, number>();
		for (const gig of gigs) {
			const newPlotId = gig.plot_id ? plotIdMap.get(gig.plot_id) ?? null : null;
			const result = await db.run(
				'INSERT INTO gigs (band_id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					newBandId,
					gig.name,
					gig.venue,
					gig.date,
					gig.time,
					gig.set_time,
					gig.changeover_minutes,
					newPlotId,
					gig.notes
				]
			);
			gigIdMap.set(gig.id, result.lastInsertRowid);
		}

		if (gigs.length > 0) {
			const gigIds = gigs.map((gig) => gig.id);
			const gigPlaceholders = gigIds.map(() => '?').join(',');
			const setlists = await db.query<{
				id: number;
				gig_id: number;
				name: string;
			}>(
				`SELECT id, gig_id, name FROM setlists WHERE gig_id IN (${gigPlaceholders})`,
				gigIds
			);
			const setlistIdMap = new Map<number, number>();
			for (const setlist of setlists) {
				const newGigId = gigIdMap.get(setlist.gig_id);
				if (!newGigId) continue;
				const result = await db.run(
					'INSERT INTO setlists (gig_id, name) VALUES (?, ?)',
					[newGigId, setlist.name]
				);
				setlistIdMap.set(setlist.id, result.lastInsertRowid);
			}

			if (setlists.length > 0) {
				const setlistIds = setlists.map((setlist) => setlist.id);
				const setlistPlaceholders = setlistIds.map(() => '?').join(',');
				const setlistSongs = await db.query<{
					setlist_id: number;
					song_id: number;
					position: number;
					notes: string | null;
				}>(
					`SELECT setlist_id, song_id, position, notes FROM setlist_songs WHERE setlist_id IN (${setlistPlaceholders})`,
					setlistIds
				);
				for (const setlistSong of setlistSongs) {
					const newSetlistId = setlistIdMap.get(setlistSong.setlist_id);
					const newSongId = songIdMap.get(setlistSong.song_id);
					if (!newSetlistId || !newSongId) continue;
					await db.run(
						'INSERT INTO setlist_songs (setlist_id, song_id, position, notes) VALUES (?, ?, ?, ?)',
						[newSetlistId, newSongId, setlistSong.position, setlistSong.notes]
					);
				}
			}
		}

		await loadBands();
	}

	function safeSlug(value: string) {
		return value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)+/g, '') || 'stageplotter';
	}

	function buildCanvasConfig(width?: number, height?: number): CanvasConfig & { width: number; height: number } {
		const safeWidth = width && width > 0 ? width : 1100;
		const safeHeight = height && height > 0 ? height : 850;
		const orientation = safeWidth >= safeHeight ? 'landscape' : 'portrait';
		return {
			format: 'letter',
			orientation,
			dpi: 96,
			width: safeWidth,
			height: safeHeight
		};
	}

	function getPlatformLabel() {
		if (!isTauri()) return 'web';
		if (typeof navigator === 'undefined') return 'tauri-desktop';
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('windows')) return 'tauri-windows';
		if (ua.includes('mac os') || ua.includes('macintosh')) return 'tauri-macos';
		if (ua.includes('linux')) return 'tauri-linux';
		return 'tauri-desktop';
	}

	function normalizeProjects(data: any): any[] {
		if (!data) return [];
		if (Array.isArray(data)) return data;
		if (data.type === 'band_project_bundle' && Array.isArray(data.projects)) return data.projects;
		if (data.type === 'band_project') return [data];
		return [];
	}

	function buildMusicians(players: any[]) {
		return players.map((player, index) => ({
			id: index + 1,
			name: player.person?.name ?? 'Unknown Musician',
			instrument: ''
		}));
	}

	function buildItemsFromPlaced(placedItems: any[], itemCatalog: Map<string, any>, playerById: Map<string, string>) {
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

	async function importBandProject(project: any, existingIds: Set<string>) {
		if (!project || project.type !== 'band_project') return;
		const sourceBand = project.band ?? {};
		let bandId = sourceBand.id ?? crypto.randomUUID().replace(/-/g, '');
		if (existingIds.has(bandId)) {
			bandId = crypto.randomUUID().replace(/-/g, '');
		}
		existingIds.add(bandId);
		const bandName = sourceBand.name ?? 'Imported Band';
		await db.run('INSERT INTO bands (id, name) VALUES (?, ?)', [bandId, bandName]);

		const players = Array.isArray(sourceBand.players) ? sourceBand.players : [];
		const contacts = Array.isArray(sourceBand.contacts) ? sourceBand.contacts : [];
		for (const player of players) {
			const person = player.person ?? {};
			await db.run(
				'INSERT INTO persons (band_id, name, role, pronouns, phone, email, member_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				[
					bandId,
					person.name ?? 'Unknown Musician',
					null,
					person.pronouns ?? null,
					person.phone ?? null,
					person.email ?? null,
					'performer',
					'permanent'
				]
			);
		}

		for (const contact of contacts) {
			await db.run(
				'INSERT INTO persons (band_id, name, role, pronouns, phone, email, member_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				[
					bandId,
					contact.name ?? 'Unknown Contact',
					contact.role ?? null,
					contact.pronouns ?? null,
					contact.phone ?? null,
					contact.email ?? null,
					'crew',
					'permanent'
				]
			);
		}

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
			const plotId = crypto.randomUUID().replace(/-/g, '');
			const placedItems = Array.isArray(plot.placed_items) ? plot.placed_items : [];
			const items = buildItemsFromPlaced(placedItems, itemCatalog, playerById);
			const metadata = {
				items,
				musicians
			};

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
	}

	function triggerImport() {
		fileInput?.click();
	}

	async function handleImport(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		importing = true;
		try {
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
			await loadBands();
			alert('Bands imported successfully.');
		} catch (error) {
			console.error('Import error:', error);
			alert('Import failed. Please check the file format.');
		} finally {
			importing = false;
			target.value = '';
		}
	}

	function buildFileMetadata() {
		const now = new Date().toISOString();
		return {
			created_at: now,
			modified_at: now,
			created_by: {
				app: 'StagePlotter',
				version: APP_VERSION,
				platform: getPlatformLabel()
			}
		};
	}

	function buildBandProject(
		band: { id: string; name: string },
		bandPersons: {
			id: number;
			band_id: string;
			name: string;
			role: string | null;
			pronouns: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}[],
		bandPlots: {
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
		}[]
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
				const player = players.find((p) => p.person.name === item.musician);
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
				event: plot.event_name || plot.event_date || plot.event_time || plot.venue
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
			plots
		};
	}

	async function exportBand(bandId: string) {
		openMenuBandId = null;
		await db.init();
		const band = await db.queryOne<{ id: string; name: string }>(
			'SELECT id, name FROM bands WHERE id = ?',
			[bandId]
		);
		if (!band) return;
		const bandPersons = await db.query<{
			id: number;
			band_id: string;
			name: string;
			role: string | null;
			pronouns: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}>(
			'SELECT id, band_id, name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ?',
			[bandId]
		);
		const bandPlots = await db.query<{
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
		}>(
			`SELECT id, name, revision_date, canvas_width, canvas_height, metadata, band_id, event_name, event_date, event_time, venue
			 FROM stage_plots WHERE band_id = ? ORDER BY updated_at DESC`,
			[bandId]
		);

		const project = buildBandProject(band, bandPersons, bandPlots);
		const dataStr = JSON.stringify(project, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(dataBlob);
		const timestamp = new Date().toISOString().split('T')[0];
		link.download = `${safeSlug(band.name)}-${timestamp}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	async function exportAllBands() {
		if (exporting) return;
		exporting = true;
		try {
			await db.init();

			const allBands = await db.query<{ id: string; name: string; created_at: string; updated_at: string }>(
				'SELECT id, name, created_at, updated_at FROM bands ORDER BY updated_at DESC'
			);

			const allPersons = await db.query<{
				id: number;
				band_id: string;
				name: string;
				role: string | null;
				pronouns: string | null;
				phone: string | null;
				email: string | null;
				member_type: string | null;
				status: string | null;
			}>(
				'SELECT id, band_id, name, role, pronouns, phone, email, member_type, status FROM persons'
			);

			const allPlots = await db.query<{
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
			}>(
				`SELECT id, name, revision_date, canvas_width, canvas_height, metadata, band_id, event_name, event_date, event_time, venue
				 FROM stage_plots
				 ORDER BY updated_at DESC`
			);

			const projects = allBands.map((band) => {
				const bandPersons = allPersons.filter((p) => p.band_id === band.id);
				const bandPlots = allPlots.filter((plot) => plot.band_id === band.id);
				return buildBandProject(band, bandPersons, bandPlots);
			});

			const bundle = {
				format_version: '1.0.0',
				type: 'band_project_bundle',
				exported_at: new Date().toISOString(),
				projects
			};

			const dataStr = JSON.stringify(bundle, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const link = document.createElement('a');
			link.href = URL.createObjectURL(dataBlob);
			const timestamp = new Date().toISOString().split('T')[0];
			link.download = `${safeSlug('all-bands')}-${timestamp}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (error) {
			console.error('Failed to export bands:', error);
			alert('Export failed. Please try again.');
		} finally {
			exporting = false;
		}
	}

	onMount(() => {
		loadBands();
	});
</script>

<svelte:window
	onclick={() => (openMenuBandId = null)}
	onkeydown={(event) => {
		if ((event as KeyboardEvent).key === 'Escape') {
			openMenuBandId = null;
			cancelRenameBand();
		}
	}}
/>

<div class="flex h-[100dvh] max-w-md mx-auto flex-col gap-6 py-6">
	<div class="flex items-center justify-between">
		<h1 class="font-serif text-3xl font-bold text-text-primary">Your Bands</h1>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-secondary">Loading...</p>
		</div>
	{:else if bands.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center gap-4">
			<p class="text-lg text-text-secondary">Create your first band to get started</p>
			<button
				onclick={createBand}
				class="rounded-lg bg-stone-900 px-6 py-3 text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			>
				Create Band
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each bands as band (band.id)}
				<div
					class="group relative flex items-start justify-between gap-3 rounded-xl border border-border-primary bg-surface p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
				>
					{#if editingBandId === band.id}
						<form
							onsubmit={(event) => {
								event.preventDefault();
								saveBandName(band.id);
							}}
							class="flex flex-1 items-center gap-2"
						>
							<input
								bind:value={bandNameInput}
								class="w-full border-b border-dashed border-border-secondary bg-transparent px-1 py-1 font-serif text-xl font-semibold text-text-primary focus:border-stone-500 focus:outline-none"
								autofocus
							/>
							<button
								type="submit"
								class="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
							>
								Save
							</button>
							<button
								type="button"
								onclick={cancelRenameBand}
								class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
							>
								Cancel
							</button>
						</form>
					{:else}
						<a href="/bands/{band.id}" class="flex-1">
							<h2 class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600">{band.name}</h2>
							<div class="mt-2 flex items-center gap-4 text-sm text-text-secondary">
								<span>{band.plot_count} {band.plot_count === 1 ? 'plot' : 'plots'}</span>
								{#if band.created_at}
									<span>Created {new Date(band.created_at).toLocaleDateString()}</span>
								{/if}
							</div>
						</a>
						<button
							onclick={(event) => {
								event.stopPropagation();
								openMenuBandId = openMenuBandId === band.id ? null : band.id;
							}}
							class="rounded p-1.5 text-text-tertiary opacity-0 transition hover:bg-surface-hover hover:text-text-primary group-hover:opacity-100"
							aria-label="Open band menu"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</button>
						{#if openMenuBandId === band.id}
							<div
								onclick={(event) => event.stopPropagation()}
								class="absolute right-4 top-12 z-10 w-44 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
							>
								<button
									onclick={() => duplicateBand(band.id)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Duplicate
								</button>
								<button
									onclick={() => exportBand(band.id)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Export band
								</button>
								<button
									onclick={() => startRenameBand(band)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Rename band
								</button>
								<button
									onclick={() => deleteBand(band.id, band.name)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete band
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border-primary pt-4">
		<input
			bind:this={fileInput}
			type="file"
			accept=".json"
			onchange={handleImport}
			style="display: none"
		/>
		<div class="flex flex-wrap items-center gap-2">
			<button
				onclick={triggerImport}
				disabled={loading || importing}
				class="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
				title="Import bands and plots"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
				</svg>
				{importing ? 'Importing...' : 'Import'}
			</button>
			<button
				onclick={exportAllBands}
				disabled={loading || bands.length === 0 || exporting}
				class="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
				title="Export all bands and plots"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
				</svg>
				{exporting ? 'Exporting...' : 'Export All'}
			</button>
		</div>
		<button
			onclick={createBand}
			class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
			</svg>
			New Band
		</button>
	</div>
</div>
