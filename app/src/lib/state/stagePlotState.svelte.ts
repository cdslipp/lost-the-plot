// SPDX-License-Identifier: AGPL-3.0-only
//
// Svelte 5 class-based state management for the plot editor.
// Instantiated per-page, provided via setContext('plotState', ...).
// SQLite is the source of truth -- this class is a reactive cache with write-through.

import { db } from '$lib/db';
import { PlotHistory, type PlotSnapshot } from '$lib/utils/plotHistory.svelte';
import { imagePxToFeet, type UnitSystem } from '$lib/utils/scale';
import {
	getItemZone as _getItemZone,
	getItemPosition as _getItemPosition,
	snapToGrid as _snapToGrid,
	getItemVariants,
	getVariantKeys,
	buildImagePath
} from '$lib/utils/canvasUtils';
import { getContext, setContext } from 'svelte';
import {
	CATALOG_TO_COLOR_CATEGORY,
	getDefaultCategoryColors,
	CONSOLES,
	getConsoleIds,
	type ColorCategory,
	type StagePlotItem as SharedStagePlotItem,
	type PlotOutputItem as SharedPlotOutputItem,
	type InputChannel,
	type OutputChannel,
	type ChannelMode
} from '@stageplotter/shared';
import { upsertPlot } from '$lib/db/repositories/plots';
import {
	getPersonsForPlot,
	getActivePersonsByBandId,
	getFullPersonsByBandId,
	createPerson as createPersonDb,
	type PersonRow
} from '$lib/db/repositories/persons';
import {
	addPersonToPlot as addPersonToPlotDb,
	removePersonFromPlot as removePersonFromPlotDb,
	getPlotPersonIds
} from '$lib/db/repositories/plotPersons';
import { getBandById } from '$lib/db/repositories/bands';

// --- Types ---
// Re-export shared types so consumers can import from one place
export type StagePlotItem = SharedStagePlotItem;
export type PlotOutputItem = SharedPlotOutputItem;

const CONTEXT_KEY = 'plotState';

// --- Context helpers ---

export function setPlotState(state: StagePlotState) {
	setContext(CONTEXT_KEY, state);
}

export function getPlotState(): StagePlotState {
	return getContext<StagePlotState>(CONTEXT_KEY);
}

// --- Class ---

export class StagePlotState {
	// Route params
	plotId: string;
	bandId: string;

	// Core plot data (persisted)
	plotName = $state('Untitled Plot');
	revisionDate = $state(new Date().toISOString().split('T')[0]);
	items = $state<StagePlotItem[]>([]);
	outputs = $state<PlotOutputItem[]>([]);
	stageWidth = $state(24);
	stageDepth = $state(16);

	// Channel arrays — source of truth for channel assignments
	inputChannels = $state<InputChannel[]>([]);
	outputChannels = $state<OutputChannel[]>([]);

	// Console integration (persisted)
	consoleType = $state<string | null>(null);
	stereoLinks = $state<number[]>([]);
	outputStereoLinks = $state<number[]>([]);
	categoryColorDefaults = $state<Record<string, string>>({});

	// People
	plotPersonIds = $state<Set<number>>(new Set());
	plotPersons = $state<{ id: number; name: string; role: string | null }[]>([]);
	bandName = $state('');
	bandPersons = $state<
		{ id: number; name: string; role: string | null; member_type: string | null }[]
	>([]);
	bandPersonsFull = $state<PersonRow[]>([]);

	// UI state
	showZones = $state(true);
	snapping = $state(true);
	pdfPageFormat = $state<'letter' | 'a4'>('letter');
	unit = $state<UnitSystem>('imperial');

	// Channel mode (derived from array lengths, with sensible defaults before load)
	static readonly CHANNEL_OPTIONS: ChannelMode[] = [8, 16, 24, 32, 48];
	inputChannelMode = $derived((this.inputChannels.length || 48) as ChannelMode);
	outputChannelMode = $derived((this.outputChannels.length || 16) as ChannelMode);

	// Console derived
	consoleDef = $derived(this.consoleType ? (CONSOLES[this.consoleType] ?? null) : null);
	consoleOptions = $derived(getConsoleIds().map((id) => ({ id, name: CONSOLES[id].name })));

	// Channel-derived lookups (O(1) both directions)
	channelColors = $derived.by(() => {
		const colors: Record<number, string> = {};
		for (const ch of this.inputChannels) {
			if (ch.color) colors[ch.channelNum] = ch.color;
		}
		return colors;
	});

	itemByChannel = $derived.by(() => {
		const itemMap = new Map<number, StagePlotItem>();
		for (const item of this.items) itemMap.set(item.id, item);
		const result = new Map<number, StagePlotItem>();
		for (const ch of this.inputChannels) {
			if (ch.itemId != null) {
				const item = itemMap.get(ch.itemId);
				if (item) result.set(ch.channelNum, item);
			}
		}
		return result;
	});

	channelByItemId = $derived.by(() => {
		const map = new Map<number, number>();
		for (const ch of this.inputChannels) {
			if (ch.itemId != null) map.set(ch.itemId, ch.channelNum);
		}
		return map;
	});

	outputByChannel = $derived.by(() => {
		const outputMap = new Map<number, PlotOutputItem>();
		for (const o of this.outputs) outputMap.set(o.id, o);
		const result = new Map<number, PlotOutputItem>();
		for (const ch of this.outputChannels) {
			if (ch.outputId != null) {
				const output = outputMap.get(ch.outputId);
				if (output) result.set(ch.channelNum, output);
			}
		}
		return result;
	});

	channelByOutputId = $derived.by(() => {
		const map = new Map<number, number>();
		for (const ch of this.outputChannels) {
			if (ch.outputId != null) map.set(ch.outputId, ch.channelNum);
		}
		return map;
	});

	// Derived
	personsById = $derived(
		Object.fromEntries(this.plotPersons.map((p) => [p.id, p])) as Record<
			number,
			{ id: number; name: string; role: string | null }
		>
	);

	// History
	history: PlotHistory;

	// Write management
	private writeTimer: ReturnType<typeof setTimeout> | null = null;
	private writePromise: Promise<void> | null = null;

	constructor(plotId: string, bandId: string) {
		this.plotId = plotId;
		this.bandId = bandId;
		this.history = new PlotHistory(
			() => this.getSnapshot(),
			(s) => this.applySnapshot(s),
			() => this.debouncedWrite()
		);

		// Load unit preference from localStorage
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('stageplotter-units');
			if (saved === 'metric' || saved === 'imperial') {
				this.unit = saved;
			}
		}

		// Persist stage dimension changes + clamp items that fall outside new bounds
		let prevW = this.stageWidth;
		let prevD = this.stageDepth;
		$effect(() => {
			const sw = this.stageWidth;
			const sd = this.stageDepth;
			// Only clamp when stage actually shrinks (not on initial run)
			if (sw < prevW || sd < prevD) {
				let clamped = 0;
				for (const item of this.items) {
					const maxX = Math.max(0, sw - item.position.width);
					const maxY = Math.max(0, sd - item.position.height);
					if (item.position.x > maxX) {
						item.position.x = +maxX.toFixed(4);
						clamped++;
					}
					if (item.position.y > maxY) {
						item.position.y = +maxY.toFixed(4);
						clamped++;
					}
				}
				if (clamped > 0) {
					this.commitChange();
				}
			}
			prevW = sw;
			prevD = sd;
			this.debouncedWrite();
		});

		// Persist unit preference
		$effect(() => {
			if (typeof window !== 'undefined') {
				localStorage.setItem('stageplotter-units', this.unit);
			}
		});
	}

	// --- Snapshot helpers for undo/redo ---

	private getSnapshot(): PlotSnapshot {
		return $state.snapshot({
			items: this.items,
			inputChannels: this.inputChannels,
			outputChannels: this.outputChannels,
			outputs: this.outputs
		}) as PlotSnapshot;
	}

	private applySnapshot(s: PlotSnapshot) {
		this.items = s.items;
		this.inputChannels = s.inputChannels;
		this.outputChannels = s.outputChannels;
		this.outputs = s.outputs;
	}

	// --- Persistence ---

	async write() {
		if (!db.isReady) return;
		try {
			await upsertPlot(this.plotId, this.bandId, {
				name: this.plotName,
				revision_date: this.revisionDate,
				canvas_width: 1100, // kept for backward compat / migration reference
				canvas_height: Math.round((1100 * this.stageDepth) / this.stageWidth),
				metadata: JSON.stringify({
					coordVersion: 2,
					items: this.items,
					outputs: this.outputs,
					inputChannels: this.inputChannels,
					outputChannels: this.outputChannels,
					outputStereoLinks: this.outputStereoLinks,
					undoLog: this.history.log,
					redoStack: this.history.redoStack
				}),
				stage_width: this.stageWidth,
				stage_depth: this.stageDepth,
				console_type: this.consoleType,
				channel_colors: JSON.stringify(this.channelColors),
				stereo_links: JSON.stringify(this.stereoLinks),
				category_color_defaults: JSON.stringify(this.categoryColorDefaults)
			});
		} catch (e) {
			console.error('Failed to persist state:', e);
		}
	}

	debouncedWrite(delay = 300) {
		if (this.writeTimer) clearTimeout(this.writeTimer);
		this.writeTimer = setTimeout(() => {
			this.writeTimer = null;
			this.writePromise = this.write();
		}, delay);
	}

	async flushWrite() {
		if (this.writeTimer) {
			clearTimeout(this.writeTimer);
			this.writeTimer = null;
		}
		this.writePromise = this.write();
		await this.writePromise;
	}

	commitChange() {
		this.history.record();
		this.debouncedWrite();
	}

	// --- Channel helpers ---

	private buildInputChannels(count: number): InputChannel[] {
		return Array.from({ length: count }, (_, i) => ({
			channelNum: i + 1,
			itemId: null,
			color: null,
			name: null,
			shortName: null,
			phantom: false
		}));
	}

	private buildOutputChannels(count: number): OutputChannel[] {
		return Array.from({ length: count }, (_, i) => ({
			channelNum: i + 1,
			outputId: null
		}));
	}

	assignItemToChannel(itemId: number, channelNum: number) {
		// Clear any previous assignment for this item (keep name/color on old channel)
		for (const ch of this.inputChannels) {
			if (ch.itemId === itemId) {
				ch.itemId = null;
			}
		}
		// Assign to new channel
		const idx = channelNum - 1;
		if (idx >= 0 && idx < this.inputChannels.length) {
			this.inputChannels[idx].itemId = itemId;
			// Seed channel name from item if channel has no name yet
			if (!this.inputChannels[idx].name) {
				const item = this.items.find((i) => i.id === itemId);
				if (item) this.inputChannels[idx].name = item.name;
			}
		}
	}

	unassignChannel(channelNum: number) {
		const idx = channelNum - 1;
		if (idx >= 0 && idx < this.inputChannels.length) {
			this.inputChannels[idx].itemId = null;
			this.inputChannels[idx].color = null;
			// Keep name and shortName — channel identity persists after unlinking
		}
	}

	setInputChannelMode(newMode: ChannelMode) {
		const current = this.inputChannels.length;
		if (newMode === current) return;
		if (newMode > current) {
			for (let i = current + 1; i <= newMode; i++) {
				this.inputChannels.push({
					channelNum: i,
					itemId: null,
					color: null,
					name: null,
					shortName: null,
					phantom: false
				});
			}
		} else {
			this.inputChannels = this.inputChannels.slice(0, newMode);
		}
		this.debouncedWrite();
	}

	setOutputChannelMode(newMode: ChannelMode) {
		const current = this.outputChannels.length;
		if (newMode === current) return;
		if (newMode > current) {
			for (let i = current + 1; i <= newMode; i++) {
				this.outputChannels.push({ channelNum: i, outputId: null });
			}
		} else {
			this.outputStereoLinks = this.outputStereoLinks.filter((ch) => ch < newMode);
			this.outputChannels = this.outputChannels.slice(0, newMode);
		}
		this.debouncedWrite();
	}

	// --- Load from DB ---

	async load(): Promise<boolean> {
		await db.init();
		const row = await db.queryOne<any>('SELECT * FROM stage_plots WHERE id = ?', [this.plotId]);
		if (!row) return false;

		this.plotName = row.name ?? 'Untitled Plot';
		this.revisionDate = row.revision_date ?? new Date().toISOString().split('T')[0];
		this.stageWidth = row.stage_width ?? 24;
		this.stageDepth = row.stage_depth ?? 16;
		this.consoleType = row.console_type ?? null;

		// Parse JSON fields
		try {
			this.stereoLinks = JSON.parse(row.stereo_links || '[]');
		} catch {
			this.stereoLinks = [];
		}
		try {
			this.categoryColorDefaults = JSON.parse(row.category_color_defaults || '{}');
		} catch {
			this.categoryColorDefaults = {};
		}
		// Initialize category defaults from console if not yet set
		if (this.consoleType && Object.keys(this.categoryColorDefaults).length === 0) {
			this.categoryColorDefaults = getDefaultCategoryColors(this.consoleType) as Record<
				string,
				string
			>;
		}

		let meta: any = {};
		try {
			meta = JSON.parse(row.metadata || '{}');
		} catch {
			meta = {};
		}
		this.items = Array.isArray(meta.items) ? meta.items : [];
		this.outputs = Array.isArray(meta.outputs) ? meta.outputs : [];
		this.outputStereoLinks = Array.isArray(meta.outputStereoLinks) ? meta.outputStereoLinks : [];

		// --- Channel migration ---
		if (Array.isArray(meta.inputChannels)) {
			// New format: load channel arrays directly
			this.inputChannels = meta.inputChannels;
			this.outputChannels = Array.isArray(meta.outputChannels)
				? meta.outputChannels
				: this.buildOutputChannels(16);

			// Backfill name/shortName for channels from before this field existed
			const itemMap = new Map<number, (typeof this.items)[number]>();
			for (const item of this.items) itemMap.set(item.id, item);
			for (const ch of this.inputChannels) {
				if (ch.name === undefined) {
					ch.name = ch.itemId != null ? (itemMap.get(ch.itemId)?.name ?? null) : null;
				}
				if (ch.shortName === undefined) {
					ch.shortName = null;
				}
				if ((ch as any).phantom === undefined) {
					ch.phantom = false;
				}
			}
		} else {
			// Old format: build channel arrays from item.channel values
			let oldChannelColors: Record<string, string> = {};
			try {
				oldChannelColors = JSON.parse(row.channel_colors || '{}');
			} catch {
				oldChannelColors = {};
			}

			this.inputChannels = this.buildInputChannels(48);
			this.outputChannels = this.buildOutputChannels(16);

			// Migrate items' channel assignments into inputChannels
			for (const item of this.items) {
				if (item.channel) {
					const chNum = parseInt(item.channel);
					if (chNum >= 1 && chNum <= this.inputChannels.length) {
						this.inputChannels[chNum - 1].itemId = item.id;
						this.inputChannels[chNum - 1].name = item.name || null;
						const colorId = oldChannelColors[String(chNum)];
						if (colorId) {
							this.inputChannels[chNum - 1].color = colorId;
						}
					}
					delete item.channel;
				}
			}

			// Migrate outputs' channel assignments into outputChannels
			for (const output of this.outputs) {
				if (output.channel) {
					const chNum = parseInt(output.channel);
					if (chNum >= 1 && chNum <= this.outputChannels.length) {
						this.outputChannels[chNum - 1].outputId = output.id;
					}
					delete output.channel;
				}
			}
		}

		// --- V1→V2 migration: convert pixel positions to feet ---
		if (!meta.coordVersion || meta.coordVersion < 2) {
			const oldCanvasW = row.canvas_width ?? 1100;
			const oldCanvasH = Math.round((oldCanvasW * this.stageDepth) / this.stageWidth);
			const pxPerFtX = oldCanvasW / this.stageWidth;
			const pxPerFtY = oldCanvasH / this.stageDepth;

			for (const item of this.items) {
				item.position.x = +(item.position.x / pxPerFtX).toFixed(4);
				item.position.y = +(item.position.y / pxPerFtY).toFixed(4);
				item.position.width = +(item.position.width / pxPerFtX).toFixed(4);
				item.position.height = +(item.position.height / pxPerFtY).toFixed(4);
			}

			// Pixel-based undo history is meaningless after migration — clear it
			this.history.startRecording(undefined, undefined);
			// Write back immediately with coordVersion: 2
			this.debouncedWrite(0);
		} else {
			// Restore history
			const savedLog = Array.isArray(meta.undoLog) ? meta.undoLog : undefined;
			const savedRedoStack = Array.isArray(meta.redoStack) ? meta.redoStack : undefined;
			this.history.startRecording(savedLog, savedRedoStack);
		}

		// Load people + band in parallel
		const [personIds, plotPersons, bandPersons, bandPersonsFull, band] = await Promise.all([
			getPlotPersonIds(this.plotId),
			getPersonsForPlot(this.plotId),
			getActivePersonsByBandId(this.bandId),
			getFullPersonsByBandId(this.bandId),
			getBandById(this.bandId)
		]);
		this.plotPersonIds = new Set(personIds);
		this.plotPersons = plotPersons;
		this.bandPersons = bandPersons;
		this.bandPersonsFull = bandPersonsFull;

		// Band name
		this.bandName = band?.name ?? '';

		return true;
	}

	// --- Item management ---

	addItem(item: StagePlotItem) {
		this.items.push(item);
		this.commitChange();
	}

	deleteItem(id: number) {
		const idx = this.items.findIndex((i) => i.id === id);
		if (idx >= 0) {
			// Clear channel assignment for this item
			for (const ch of this.inputChannels) {
				if (ch.itemId === id) {
					ch.itemId = null;
					ch.color = null;
				}
			}
			this.items.splice(idx, 1);
			this.commitChange();
		}
	}

	deleteItems(ids: Set<string>) {
		const numericIds = new Set([...ids].map(Number));
		// Clear channel assignments for deleted items
		for (const ch of this.inputChannels) {
			if (ch.itemId != null && numericIds.has(ch.itemId)) {
				ch.itemId = null;
				ch.color = null;
			}
		}
		this.items = this.items.filter((i) => !ids.has(String(i.id)));
		this.commitChange();
	}

	duplicateItem(sourceItem: any, overrides: Partial<StagePlotItem> = {}): StagePlotItem {
		const maxId = this.items.reduce((max, i) => Math.max(max, i.id), 0);
		const clone: StagePlotItem = {
			...JSON.parse(JSON.stringify(sourceItem)),
			id: maxId + 1,
			...overrides
		};
		// Duplicates are unpatched by default
		delete clone.channel;
		this.items.push(clone);
		this.commitChange();
		return clone;
	}

	updateItemProperty(itemId: number, property: string, value: string) {
		const item = this.items.find((i) => i.id === itemId);
		if (!item) return;
		if (['riserWidth', 'riserDepth', 'riserHeight'].includes(property)) {
			if (!item.itemData) item.itemData = { name: '' };
			(item.itemData as any)[property] = parseFloat(value);
			// Store riser dimensions directly in feet
			if (property === 'riserWidth') item.position.width = parseFloat(value);
			else if (property === 'riserDepth') item.position.height = parseFloat(value);
		} else if (property === 'rotation') {
			item.position.rotation = parseFloat(value) || 0;
		} else if (property === 'person_id') {
			item.person_id = value ? parseInt(value) : null;
		} else if (property === 'channel') {
			// Channel assignment goes through the channel arrays
			const newCh = value ? parseInt(value) : null;
			// Clear any current assignment for this item
			for (const ch of this.inputChannels) {
				if (ch.itemId === itemId) {
					ch.itemId = null;
					ch.color = null;
				}
			}
			// Assign to new channel
			if (newCh != null && newCh >= 1 && newCh <= this.inputChannels.length) {
				this.inputChannels[newCh - 1].itemId = itemId;
			}
		} else {
			(item as any)[property] = value;
			// Sync item name → linked channel name
			if (property === 'name') {
				const chNum = this.channelByItemId.get(itemId);
				if (chNum != null) {
					const idx = chNum - 1;
					if (idx >= 0 && idx < this.inputChannels.length) {
						this.inputChannels[idx].name = value || null;
					}
				}
			}
		}
		this.commitChange();
	}

	nudgeItems(ids: Set<string>, dx: number, dy: number) {
		for (const item of this.items) {
			if (ids.has(String(item.id))) {
				item.position.x += dx;
				item.position.y += dy;
			}
		}
		this.commitChange();
	}

	/** Auto-number items with duplicate names (e.g. "Guitar" → "Guitar 1", "Guitar 2") */
	autoNumberItems() {
		// Group items by base name (strip trailing " N" suffix)
		const groups = new Map<string, StagePlotItem[]>();
		for (const item of this.items) {
			const baseName = item.name.replace(/\s+\d+$/, '');
			if (!groups.has(baseName)) groups.set(baseName, []);
			groups.get(baseName)!.push(item);
		}
		for (const [baseName, group] of groups) {
			if (group.length < 2) continue;
			group.forEach((item, idx) => {
				item.name = `${baseName} ${idx + 1}`;
			});
		}
	}

	// --- Z-order ---

	moveToFront(itemId: number) {
		const idx = this.items.findIndex((i) => i.id === itemId);
		if (idx < 0) return;
		const [item] = this.items.splice(idx, 1);
		this.items.push(item);
		this.commitChange();
	}

	moveToBack(itemId: number) {
		const idx = this.items.findIndex((i) => i.id === itemId);
		if (idx < 0) return;
		const [item] = this.items.splice(idx, 1);
		this.items.unshift(item);
		this.commitChange();
	}

	moveForward(itemId: number) {
		const idx = this.items.findIndex((i) => i.id === itemId);
		if (idx < 0 || idx >= this.items.length - 1) return;
		[this.items[idx], this.items[idx + 1]] = [this.items[idx + 1], this.items[idx]];
		this.commitChange();
	}

	moveBackward(itemId: number) {
		const idx = this.items.findIndex((i) => i.id === itemId);
		if (idx <= 0) return;
		[this.items[idx], this.items[idx - 1]] = [this.items[idx - 1], this.items[idx]];
		this.commitChange();
	}

	// --- Patch/channel management ---

	reorderItems(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) return;
		if (
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= this.items.length ||
			toIndex >= this.items.length
		)
			return;
		const [moved] = this.items.splice(fromIndex, 1);
		this.items.splice(toIndex, 0, moved);
		this.commitChange();
	}

	getNextAvailableChannel(): number | null {
		for (const ch of this.inputChannels) {
			if (ch.itemId == null) return ch.channelNum;
		}
		return null;
	}

	getNextAvailableOutputChannel(start = 1): number | null {
		for (let i = start - 1; i < this.outputChannels.length; i++) {
			if (this.outputChannels[i].outputId == null) return this.outputChannels[i].channelNum;
		}
		return null;
	}

	getNextAvailableOutputStereoStart(): number | null {
		for (let i = 0; i < this.outputChannels.length - 1; i++) {
			const ch = this.outputChannels[i].channelNum;
			if (ch % 2 === 0) continue; // skip even channels — stereo pairs start on odd
			if (this.outputChannels[i].outputId == null && this.outputChannels[i + 1].outputId == null) {
				return ch;
			}
		}
		return null;
	}

	removePatchItem(channel: number) {
		this.unassignChannel(channel);
		this.commitChange();
	}

	clearAllPatch() {
		for (const ch of this.inputChannels) {
			ch.itemId = null;
			ch.color = null;
			ch.name = null;
			ch.shortName = null;
		}
		for (const item of this.items) {
			item.person_id = null;
		}
		this.commitChange();
	}

	/** Clear channel assignment and auto-apply category color when console is set */
	preparePatchChannel(channel: number, itemData: any) {
		this.unassignChannel(channel);
		if (this.consoleType && itemData?.category) {
			const colorCat = CATALOG_TO_COLOR_CATEGORY[itemData.category] as ColorCategory | undefined;
			if (colorCat && this.categoryColorDefaults[colorCat]) {
				const idx = channel - 1;
				if (idx >= 0 && idx < this.inputChannels.length) {
					this.inputChannels[idx].color = this.categoryColorDefaults[colorCat];
				}
			}
		}
	}

	setOutput(channel: number, item: PlotOutputItem) {
		// Remove any previous output on this channel
		const idx = channel - 1;
		if (idx >= 0 && idx < this.outputChannels.length) {
			const prevId = this.outputChannels[idx].outputId;
			if (prevId != null) {
				this.outputs = this.outputs.filter((o) => o.id !== prevId);
			}
			this.outputChannels[idx].outputId = item.id;
		}
		// Add the output item if not already present
		if (!this.outputs.some((o) => o.id === item.id)) {
			this.outputs.push(item);
		}
		this.debouncedWrite();
	}

	removeOutput(channel: number) {
		const idx = channel - 1;
		if (idx >= 0 && idx < this.outputChannels.length) {
			const prevId = this.outputChannels[idx].outputId;
			if (prevId != null) {
				this.outputs = this.outputs.filter((o) => o.id !== prevId);
			}
			this.outputChannels[idx].outputId = null;
		}
		this.debouncedWrite();
	}

	// --- Monitor/output inference (pure) ---

	isMonitorItem(itemData: any): boolean {
		const category = (itemData?.category ?? '').toString().toLowerCase();
		const path = (itemData?.path ?? '').toString().toLowerCase();
		return (
			category.includes('monitor') ||
			path.startsWith('monitors/') ||
			path.startsWith('outputs/monitors')
		);
	}

	inferOutputType(itemData: any): string {
		const path = (itemData?.path ?? '').toString().toLowerCase();
		if (path.includes('inear')) return 'iem_stereo';
		if (path.includes('sidefill')) return 'sidefill';
		if (path.includes('subwoofer')) return 'sub';
		if (path.includes('linearray')) return 'line_array';
		if (path.includes('bosel1')) return 'column_speaker';
		if (path.includes('personalsys')) return 'personal_system';
		if (path.includes('speakerwstand') || path.includes('speaknsubwstand')) return 'pa_speaker';
		if (path.includes('lowprofile') || path.includes('wedge')) return 'wedge';
		return 'monitor';
	}

	inferOutputLinkMode(itemData: any): string {
		const path = (itemData?.path ?? '').toString().toLowerCase();
		if (path.includes('inear') || path.includes('sidefill')) return 'stereo_pair';
		return 'mono';
	}

	addDefaultOutputs(itemData: any) {
		const defaults = itemData?.default_outputs;
		const derivedDefaults = this.isMonitorItem(itemData)
			? [
					{
						name: itemData?.name || 'Monitor',
						type: this.inferOutputType(itemData),
						link_mode: this.inferOutputLinkMode(itemData)
					}
				]
			: [];
		const outputDefs = Array.isArray(defaults) && defaults.length > 0 ? defaults : derivedDefaults;
		if (!outputDefs.length) return;

		outputDefs.forEach((outputDef: any, idx: number) => {
			const linkMode = outputDef?.link_mode ?? this.inferOutputLinkMode(itemData);
			const baseName = outputDef?.name || itemData?.name || 'Output';
			if (linkMode === 'stereo_pair') {
				const start = this.getNextAvailableOutputStereoStart();
				if (start == null) return;
				const leftId = Date.now() + idx * 2;
				const rightId = Date.now() + idx * 2 + 1;
				this.outputs.push(
					{
						id: leftId,
						name: `${baseName} L`,
						itemData,
						link_mode: 'stereo_pair'
					},
					{
						id: rightId,
						name: `${baseName} R`,
						itemData,
						link_mode: 'stereo_pair'
					}
				);
				this.outputChannels[start - 1].outputId = leftId;
				this.outputChannels[start].outputId = rightId;
				this.outputStereoLinks = Array.from(new Set([...this.outputStereoLinks, start])).sort(
					(a, b) => a - b
				);
			} else {
				const ch = this.getNextAvailableOutputChannel();
				if (ch == null) return;
				const id = Date.now() + idx;
				this.outputs.push({
					id,
					name: baseName,
					itemData,
					link_mode: linkMode
				});
				this.outputChannels[ch - 1].outputId = id;
			}
		});
		this.debouncedWrite();
	}

	// --- Console settings ---

	setConsoleType(newType: string | null) {
		this.consoleType = newType;
		if (newType && Object.keys(this.categoryColorDefaults).length === 0) {
			this.categoryColorDefaults = getDefaultCategoryColors(newType) as Record<string, string>;
		}
		// Clamp channel modes to console limits
		const def = newType ? (CONSOLES[newType] ?? null) : null;
		if (def) {
			const maxIn = def.inputChannels as ChannelMode;
			if (StagePlotState.CHANNEL_OPTIONS.includes(maxIn) && this.inputChannels.length > maxIn) {
				this.setInputChannelMode(maxIn);
			}
			const maxOut = def.outputBuses as ChannelMode;
			if (StagePlotState.CHANNEL_OPTIONS.includes(maxOut) && this.outputChannels.length > maxOut) {
				this.setOutputChannelMode(maxOut);
			}
			// Truncate short names that exceed the new console's scribble strip length
			if (def.scribbleStripLength) {
				for (const ch of this.inputChannels) {
					if (ch.shortName && ch.shortName.length > def.scribbleStripLength) {
						ch.shortName = ch.shortName.slice(0, def.scribbleStripLength);
					}
				}
			}
		}
		this.debouncedWrite();
	}

	setChannelColor(ch: number, colorId: string) {
		const idx = ch - 1;
		if (idx >= 0 && idx < this.inputChannels.length) {
			this.inputChannels[idx].color = colorId;
		}
		this.debouncedWrite();
	}

	setChannelName(channelNum: number, name: string) {
		const idx = channelNum - 1;
		if (idx < 0 || idx >= this.inputChannels.length) return;
		this.inputChannels[idx].name = name || null;
		// Sync to linked item if present
		const itemId = this.inputChannels[idx].itemId;
		if (itemId != null) {
			const item = this.items.find((i) => i.id === itemId);
			if (item) item.name = name;
		}
		this.debouncedWrite();
	}

	setChannelShortName(channelNum: number, shortName: string) {
		const idx = channelNum - 1;
		if (idx < 0 || idx >= this.inputChannels.length) return;
		const maxLen = this.consoleDef?.scribbleStripLength;
		const clamped = maxLen && shortName.length > maxLen ? shortName.slice(0, maxLen) : shortName;
		this.inputChannels[idx].shortName = clamped || null;
		this.debouncedWrite();
	}

	setStereoLinks(links: number[]) {
		this.stereoLinks = links;
		this.debouncedWrite();
	}

	setChannelPhantom(channelNum: number, on: boolean) {
		const idx = channelNum - 1;
		if (idx < 0 || idx >= this.inputChannels.length) return;
		this.inputChannels[idx].phantom = on;
		this.debouncedWrite();
	}

	toggleStereoLink(channelNum: number) {
		// Stereo links are keyed by the odd channel of a pair
		const startCh = channelNum % 2 === 0 ? channelNum - 1 : channelNum;
		const newLinks = [...this.stereoLinks];
		const idx = newLinks.indexOf(startCh);
		if (idx >= 0) {
			newLinks.splice(idx, 1);
		} else {
			newLinks.push(startCh);
			newLinks.sort((a, b) => a - b);
		}
		this.stereoLinks = newLinks;
		this.debouncedWrite();
	}

	setOutputStereoLinks(links: number[]) {
		this.outputStereoLinks = links;
		this.debouncedWrite();
	}

	setCategoryColorDefaults(defaults: Record<string, string>) {
		this.categoryColorDefaults = defaults;
		this.debouncedWrite();
	}

	// --- People management ---

	async addPersonToPlot(personId: number, silhouetteItem?: any): Promise<any | null> {
		this.plotPersonIds.add(personId);
		await addPersonToPlotDb(this.plotId, personId);
		this.plotPersons = await getPersonsForPlot(this.plotId);
		return silhouetteItem ?? null;
	}

	async createAndAddPerson(name: string): Promise<number> {
		const id = await createPersonDb(this.bandId, name, {
			member_type: 'performer',
			status: 'permanent'
		});
		this.bandPersons = await getActivePersonsByBandId(this.bandId);
		return id;
	}

	async removePersonFromPlot(personId: number) {
		this.plotPersonIds.delete(personId);
		await removePersonFromPlotDb(this.plotId, personId);
		this.plotPersons = this.plotPersons.filter((p) => p.id !== personId);
	}

	// --- Stage helpers (all in feet) ---

	getItemZone(item: any): string {
		return _getItemZone(item, this.stageWidth, this.stageDepth);
	}

	getItemPosition(item: any): { x: number; y: number } {
		return _getItemPosition(item, this.stageWidth, this.stageDepth);
	}

	snapToGrid(x: number, y: number, w: number, h: number): { x: number; y: number } {
		return _snapToGrid(x, y, w, h, this.snapping, this.stageWidth, this.stageDepth);
	}

	/** Set item position from center-relative feet coordinates (used by Inspector) */
	updateItemPosition(itemId: number, relX: number, relY: number) {
		const item = this.items.find((i) => i.id === itemId);
		if (!item) return;
		const cx = relX + this.stageWidth / 2 - item.position.width / 2;
		const cy = this.stageDepth - relY - item.position.height / 2;
		item.position.x = +cx.toFixed(4);
		item.position.y = +cy.toFixed(4);
		this.commitChange();
	}

	// --- Variant rotation ---

	rotateItemLeft(item: any) {
		const variants = getItemVariants(item);
		if (!variants) return;
		const variantKeys = getVariantKeys(item);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex - 1 + variantKeys.length) % variantKeys.length;
		this.setVariant(item, variantKeys[newIndex]);
	}

	rotateItemRight(item: any) {
		const variants = getItemVariants(item);
		if (!variants) return;
		const variantKeys = getVariantKeys(item);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex + 1) % variantKeys.length;
		this.setVariant(item, variantKeys[newIndex]);
	}

	setVariant(item: any, variantKey: string) {
		const variants = getItemVariants(item);
		if (!variants || !variants[variantKey]) return;
		item.currentVariant = variantKey;
		const newImagePath = variants[variantKey];
		const img = new Image();
		img.src = buildImagePath(item, newImagePath);
		img.onload = () => {
			item.position.width = imagePxToFeet(img.naturalWidth);
			item.position.height = imagePxToFeet(img.naturalHeight);
			this.commitChange();
		};
		this.updateItemProperty(item.id, 'currentVariant', variantKey);
	}
}
