// SPDX-License-Identifier: AGPL-3.0-only
//
// Svelte 5 class-based state management for the plot editor.
// Instantiated per-page, provided via setContext('plotState', ...).
// SQLite is the source of truth -- this class is a reactive cache with write-through.

import { db } from '$lib/db';
import { PlotHistory } from '$lib/utils/plotHistory.svelte';
import { feetToPixels, type UnitSystem } from '$lib/utils/scale';
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
	canvasWidth = $state(1100);
	canvasHeight = $state(850);

	// Console integration (persisted)
	consoleType = $state<string | null>(null);
	channelColors = $state<Record<number, string>>({});
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

	// Channel mode
	static readonly CHANNEL_OPTIONS: ChannelMode[] = [8, 16, 24, 32, 48];
	inputChannelMode = $state<ChannelMode>(48);
	outputChannelMode = $state<ChannelMode>(16);

	// Console derived
	consoleDef = $derived(this.consoleType ? (CONSOLES[this.consoleType] ?? null) : null);
	consoleOptions = $derived(getConsoleIds().map((id) => ({ id, name: CONSOLES[id].name })));

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

	// Track previous stage dimensions for rescaling
	private prevStageWidth = 0;
	private prevStageDepth = 0;

	constructor(plotId: string, bandId: string) {
		this.plotId = plotId;
		this.bandId = bandId;
		this.history = new PlotHistory(this.items, () => this.debouncedWrite());

		// Load unit preference from localStorage
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('stageplotter-units');
			if (saved === 'metric' || saved === 'imperial') {
				this.unit = saved;
			}
		}

		// Rescale items proportionally when stage dimensions change
		$effect(() => {
			const newW = this.stageWidth;
			const newD = this.stageDepth;
			if (
				this.prevStageWidth > 0 &&
				this.prevStageDepth > 0 &&
				(newW !== this.prevStageWidth || newD !== this.prevStageDepth)
			) {
				const scaleX = newW / this.prevStageWidth;
				const scaleY = newD / this.prevStageDepth;
				for (const item of this.items) {
					item.position.x = Math.round(item.position.x * scaleX);
					item.position.y = Math.round(item.position.y * scaleY);
					if (item.type === 'riser') {
						item.position.width = Math.round(item.position.width * scaleX);
						item.position.height = Math.round(item.position.height * scaleY);
					}
				}
			}
			this.prevStageWidth = newW;
			this.prevStageDepth = newD;
			this.debouncedWrite();
		});

		// Persist unit preference
		$effect(() => {
			if (typeof window !== 'undefined') {
				localStorage.setItem('stageplotter-units', this.unit);
			}
		});
	}

	// --- Persistence ---

	async write() {
		if (!db.isReady) return;
		try {
			await upsertPlot(this.plotId, this.bandId, {
				name: this.plotName,
				revision_date: this.revisionDate,
				canvas_width: this.canvasWidth,
				canvas_height: this.canvasHeight,
				metadata: JSON.stringify({
					items: $state.snapshot(this.items),
					outputs: $state.snapshot(this.outputs),
					outputStereoLinks: $state.snapshot(this.outputStereoLinks),
					undoLog: $state.snapshot(this.history.log),
					redoStack: $state.snapshot(this.history.redoStack)
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
		this.history.record($state.snapshot(this.items) as any[]);
		this.debouncedWrite();
	}

	// --- Load from DB ---

	async load(): Promise<boolean> {
		await db.init();
		const row = await db.queryOne<any>('SELECT * FROM stage_plots WHERE id = ?', [this.plotId]);
		if (!row) return false;

		this.plotName = row.name ?? 'Untitled Plot';
		this.revisionDate = row.revision_date ?? new Date().toISOString().split('T')[0];
		this.canvasWidth = row.canvas_width ?? 1100;
		this.canvasHeight = row.canvas_height ?? 850;
		this.stageWidth = row.stage_width ?? 24;
		this.stageDepth = row.stage_depth ?? 16;
		this.consoleType = row.console_type ?? null;

		// Parse JSON fields
		try {
			this.channelColors = JSON.parse(row.channel_colors || '{}');
		} catch {
			this.channelColors = {};
		}
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

		// Restore history
		const savedLog = Array.isArray(meta.undoLog) ? meta.undoLog : undefined;
		const savedRedoStack = Array.isArray(meta.redoStack) ? meta.redoStack : undefined;
		this.history.startRecording(savedLog, savedRedoStack);

		// Load people
		const personIds = await getPlotPersonIds(this.plotId);
		this.plotPersonIds = new Set(personIds);
		this.plotPersons = await getPersonsForPlot(this.plotId);
		this.bandPersons = await getActivePersonsByBandId(this.bandId);
		this.bandPersonsFull = await getFullPersonsByBandId(this.bandId);

		// Band name
		const band = await getBandById(this.bandId);
		this.bandName = band?.name ?? '';

		// Seed prev dimensions for rescale tracking
		this.prevStageWidth = this.stageWidth;
		this.prevStageDepth = this.stageDepth;

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
			this.items.splice(idx, 1);
			this.commitChange();
		}
	}

	deleteItems(ids: Set<string>) {
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
			if (property === 'riserWidth') item.position.width = feetToPixels(parseFloat(value));
			else if (property === 'riserDepth') item.position.height = feetToPixels(parseFloat(value));
		} else if (property === 'person_id') {
			item.person_id = value ? parseInt(value) : null;
		} else {
			(item as any)[property] = value;
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

	getNextAvailableChannel(): number {
		const used = new Set(this.items.filter((i) => i.channel).map((i) => parseInt(i.channel)));
		let ch = 1;
		while (used.has(ch)) ch++;
		return ch;
	}

	getUsedOutputChannels(): Set<number> {
		return new Set(this.outputs.filter((o) => o.channel).map((o) => parseInt(o.channel)));
	}

	getNextAvailableOutputChannel(start = 1): number | null {
		const used = this.getUsedOutputChannels();
		for (let ch = start; ch <= this.outputChannelMode; ch++) {
			if (!used.has(ch)) return ch;
		}
		return null;
	}

	getNextAvailableOutputStereoStart(): number | null {
		const used = this.getUsedOutputChannels();
		for (let ch = 1; ch < this.outputChannelMode; ch++) {
			if (ch % 2 === 0) continue;
			if (!used.has(ch) && !used.has(ch + 1)) return ch;
		}
		return null;
	}

	removePatchItem(channel: number) {
		this.items = this.items.filter((i) => i.channel !== String(channel));
		this.commitChange();
	}

	clearAllPatch() {
		for (const item of this.items) {
			item.channel = '';
			item.person_id = null;
		}
		this.commitChange();
	}

	/** Remove items on this channel and auto-apply category color when console is set */
	preparePatchChannel(channel: number, itemData: any) {
		this.items = this.items.filter((i) => i.channel !== String(channel));
		if (this.consoleType && itemData?.category) {
			const colorCat = CATALOG_TO_COLOR_CATEGORY[itemData.category] as ColorCategory | undefined;
			if (colorCat && this.categoryColorDefaults[colorCat]) {
				this.channelColors = {
					...this.channelColors,
					[channel]: this.categoryColorDefaults[colorCat]
				};
				this.debouncedWrite();
			}
		}
	}

	setOutput(channel: number, item: PlotOutputItem) {
		this.outputs = this.outputs.filter((o) => o.channel !== String(channel));
		this.outputs.push(item);
		this.debouncedWrite();
	}

	removeOutput(channel: number) {
		this.outputs = this.outputs.filter((o) => o.channel !== String(channel));
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
				this.outputs = this.outputs.filter(
					(o) => o.channel !== String(start) && o.channel !== String(start + 1)
				);
				this.outputs.push(
					{
						id: Date.now() + idx * 2,
						name: `${baseName} L`,
						channel: String(start),
						itemData,
						link_mode: 'stereo_pair'
					},
					{
						id: Date.now() + idx * 2 + 1,
						name: `${baseName} R`,
						channel: String(start + 1),
						itemData,
						link_mode: 'stereo_pair'
					}
				);
				this.outputStereoLinks = Array.from(new Set([...this.outputStereoLinks, start])).sort(
					(a, b) => a - b
				);
			} else {
				const ch = this.getNextAvailableOutputChannel();
				if (ch == null) return;
				this.outputs = this.outputs.filter((o) => o.channel !== String(ch));
				this.outputs.push({
					id: Date.now() + idx,
					name: baseName,
					channel: String(ch),
					itemData,
					link_mode: linkMode
				});
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
			if (StagePlotState.CHANNEL_OPTIONS.includes(maxIn) && this.inputChannelMode > maxIn) {
				this.inputChannelMode = maxIn;
			}
			const maxOut = def.outputBuses as ChannelMode;
			if (StagePlotState.CHANNEL_OPTIONS.includes(maxOut) && this.outputChannelMode > maxOut) {
				this.outputChannelMode = maxOut;
			}
		}
		this.debouncedWrite();
	}

	setChannelColor(ch: number, colorId: string) {
		this.channelColors = { ...this.channelColors, [ch]: colorId };
		this.debouncedWrite();
	}

	setStereoLinks(links: number[]) {
		this.stereoLinks = links;
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

	// --- Canvas helpers (closures over current dimensions) ---

	getItemZone(item: any): string {
		return _getItemZone(item, this.canvasWidth, this.canvasHeight);
	}

	getItemPosition(item: any): { x: number; y: number } {
		return _getItemPosition(item, this.canvasWidth, this.canvasHeight);
	}

	snapToGrid(x: number, y: number, w: number, h: number): { x: number; y: number } {
		return _snapToGrid(x, y, w, h, this.snapping, this.canvasWidth, this.canvasHeight);
	}

	updateItemPosition(itemId: number, relX: number, relY: number) {
		const item = this.items.find((i) => i.id === itemId);
		if (!item) return;
		const cx = relX + this.canvasWidth / 2 - item.position.width / 2;
		const cy = this.canvasHeight - relY - item.position.height / 2;
		item.position.x = Math.round(cx);
		item.position.y = Math.round(cy);
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
			item.position.width = img.naturalWidth;
			item.position.height = img.naturalHeight;
			this.commitChange();
		};
		this.updateItemProperty(item.id, 'currentVariant', variantKey);
	}
}
