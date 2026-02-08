<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { ItemCommandPalette, StagePatch, ImportExport } from '$lib';
	import type { ProcessedItem } from '$lib/utils/finalAssetsLoader';
	import Selecto from 'selecto';
	import { onClickOutside, PressedKeys } from 'runed';
	import StageDeck from '$lib/components/StageDeck.svelte';
	import { ContextMenu } from 'bits-ui';
	import { db } from '$lib/db';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import EditorToolbar from '$lib/components/EditorToolbar.svelte';
	import EditorSidePanel from '$lib/components/EditorSidePanel.svelte';
	import CanvasOverlay from '$lib/components/CanvasOverlay.svelte';
	import { exportToPdf } from '$lib/utils/pdf';
	import { feetToPixels, type UnitSystem } from '$lib/utils/scale';
	import { browser } from '$app/environment';
	import {
		getItemZone as _getItemZone,
		getItemPosition as _getItemPosition,
		snapToGrid as _snapToGrid,
		getItemVariants,
		getVariantKeys,
		buildImagePath,
		getCurrentImageSrc
	} from '$lib/utils/canvasUtils';
	import { PlotHistory } from '$lib/utils/plotHistory.svelte';

	let plotId = $derived($page.params.plotId);
	let bandId = $derived($page.params.bandId);

	let bandName = $state('');
	let bandPersons = $state<
		{ id: number; name: string; role: string | null; member_type: string | null }[]
	>([]);
	let bandPersonsFull = $state<
		{
			id: number;
			name: string;
			role: string | null;
			pronouns: string | null;
			phone: string | null;
			email: string | null;
			member_type: string | null;
			status: string | null;
		}[]
	>([]);

	import {
		CATALOG_TO_COLOR_CATEGORY,
		getDefaultCategoryColors,
		type ColorCategory,
		type ChannelMode,
		type StagePlotItem,
		type PlotOutputItem,
		CONSOLES,
		getConsoleIds
	} from '@stageplotter/shared';

	// Reactive stage plot state — initialized in-memory, persisted to SQLite
	let stagePlot = $state({
		plot_name: 'Untitled Plot',
		revision_date: new Date().toISOString().split('T')[0],
		canvas: { width: 1100, height: 850 },
		items: [] as StagePlotItem[],
		outputs: [] as PlotOutputItem[],
		stage_width: 24,
		stage_depth: 16
	});

	// People system: plot_persons junction table tracks which persons are on this plot
	let plotPersonIds = $state<Set<number>>(new Set());
	let plotPersons = $state<{ id: number; name: string; role: string | null }[]>([]);
	const personsById = $derived(
		Object.fromEntries(plotPersons.map((p) => [p.id, p])) as Record<
			number,
			{ id: number; name: string; role: string | null }
		>
	);

	// Console integration state — persisted to dedicated DB columns
	let consoleType = $state<string | null>(null);
	let channelColors = $state<Record<number, string>>({});
	let stereoLinks = $state<number[]>([]);
	let outputStereoLinks = $state<number[]>([]);
	let categoryColorDefaults = $state<Record<string, string>>({});

	let layoutMode = $state<'mobile' | 'medium' | 'desktop'>('desktop');
	let sidePanelTab = $state<'inspector' | 'people' | 'settings'>('inspector');
	let mediumMainTab = $state<'canvas' | 'patch'>('canvas');
	let mobileMainTab = $state<'canvas' | 'patch' | 'panel'>('canvas');
	let mobilePanelTab = $state<'inspector' | 'people' | 'settings'>('inspector');

	// Snapping
	let snapping = $state(true);

	// Channel mode state (lifted from StagePatch for settings tab)
	const CHANNEL_OPTIONS: ChannelMode[] = [8, 16, 24, 32, 48];
	let inputChannelMode = $state<ChannelMode>(48);
	let outputChannelMode = $state<ChannelMode>(16);

	// Console-derived values for settings UI
	const consoleDef = $derived(consoleType ? (CONSOLES[consoleType] ?? null) : null);
	const consoleOptions = $derived(
		getConsoleIds().map((id) => ({
			id,
			name: CONSOLES[id].name
		}))
	);

	// Auto-set channel mode when console changes
	$effect(() => {
		if (consoleDef) {
			const maxIn = consoleDef.inputChannels as ChannelMode;
			if (CHANNEL_OPTIONS.includes(maxIn) && inputChannelMode > maxIn) {
				inputChannelMode = maxIn;
			}
			const maxOut = consoleDef.outputBuses as ChannelMode;
			if (CHANNEL_OPTIONS.includes(maxOut) && outputChannelMode > maxOut) {
				outputChannelMode = maxOut;
			}
		}
	});

	// Persist reactive state to SQLite
	async function write() {
		if (!db.isReady) return;
		try {
			await db.run(
				`INSERT OR REPLACE INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth, console_type, channel_colors, stereo_links, category_color_defaults)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					plotId,
					stagePlot.plot_name,
					stagePlot.revision_date,
					stagePlot.canvas.width,
					stagePlot.canvas.height,
					JSON.stringify({
						items: $state.snapshot(stagePlot.items),
						outputs: $state.snapshot(stagePlot.outputs),
						outputStereoLinks: $state.snapshot(outputStereoLinks),
						undoLog: $state.snapshot(history.log),
						redoStack: $state.snapshot(history.redoStack)
					}),
					bandId,
					stagePlot.stage_width,
					stagePlot.stage_depth,
					consoleType,
					JSON.stringify(channelColors),
					JSON.stringify(stereoLinks),
					JSON.stringify(categoryColorDefaults)
				]
			);
		} catch (e) {
			console.error('Failed to persist state:', e);
		}
	}

	// Debounced write — collapses rapid changes (nudges, drags) into fewer DB writes
	let writeTimer: ReturnType<typeof setTimeout> | null = null;
	let writePromise: Promise<void> | null = null;

	function debouncedWrite(delay = 300) {
		if (writeTimer) clearTimeout(writeTimer);
		writeTimer = setTimeout(() => {
			writeTimer = null;
			writePromise = write();
		}, delay);
	}

	async function flushWrite() {
		if (writeTimer) {
			clearTimeout(writeTimer);
			writeTimer = null;
		}
		writePromise = write();
		await writePromise;
	}

	function commitChange() {
		history.record($state.snapshot(stagePlot.items) as any[]);
		debouncedWrite();
	}

	// Load state from SQLite on mount
	async function loadFromDb() {
		try {
			await db.init();

			const row = await db.queryOne<{
				name: string;
				revision_date: string;
				canvas_width: number;
				canvas_height: number;
				metadata: string;
				stage_width: number | null;
				stage_depth: number | null;
				console_type: string | null;
				channel_colors: string | null;
				stereo_links: string | null;
				category_color_defaults: string | null;
			}>('SELECT * FROM stage_plots WHERE id = ?', [plotId]);

			if (row) {
				stagePlot.plot_name = row.name;
				stagePlot.revision_date = row.revision_date;
				stagePlot.canvas.width = row.canvas_width;
				stagePlot.canvas.height = row.canvas_height;
				stagePlot.stage_width = row.stage_width ?? 24;
				stagePlot.stage_depth = row.stage_depth ?? 16;

				// Load console settings
				consoleType = row.console_type ?? null;
				try {
					channelColors = row.channel_colors ? JSON.parse(row.channel_colors) : {};
				} catch {
					channelColors = {};
				}
				try {
					stereoLinks = row.stereo_links ? JSON.parse(row.stereo_links) : [];
				} catch {
					stereoLinks = [];
				}
				try {
					categoryColorDefaults = row.category_color_defaults
						? JSON.parse(row.category_color_defaults)
						: {};
				} catch {
					categoryColorDefaults = {};
				}
				// If console is set but no category defaults, initialize from console defaults
				if (consoleType && Object.keys(categoryColorDefaults).length === 0) {
					categoryColorDefaults = getDefaultCategoryColors(consoleType) as Record<string, string>;
				}

				let savedUndoLog: { snapshot: any[]; timestamp: number }[] | undefined;
				let savedRedoStack: any[][] | undefined;
				if (row.metadata) {
					try {
						const meta = JSON.parse(row.metadata);
						if (meta.items) stagePlot.items = meta.items;
						if (meta.outputs) stagePlot.outputs = meta.outputs;
						if (meta.outputStereoLinks) outputStereoLinks = meta.outputStereoLinks;
						if (meta.undoLog) savedUndoLog = meta.undoLog;
						if (meta.redoStack) savedRedoStack = meta.redoStack;
					} catch {
						/* ignore parse errors */
					}
				}
				history.startRecording(savedUndoLog, savedRedoStack);

				// Load plot persons
				const plotPersonRows = await db.query<{ person_id: number }>(
					'SELECT person_id FROM plot_persons WHERE plot_id = ?',
					[plotId]
				);
				plotPersonIds = new Set(plotPersonRows.map((r) => r.person_id));

				plotPersons = await db.query<{ id: number; name: string; role: string | null }>(
					`SELECT p.id, p.name, p.role FROM persons p
					 INNER JOIN plot_persons pp ON pp.person_id = p.id
					 WHERE pp.plot_id = ?
					 ORDER BY p.name`,
					[plotId]
				);
			} else {
				// Plot doesn't exist — redirect back to band
				goto(`/bands/${bandId}`, { replaceState: true });
			}

			// Load band name
			const bandRow = await db.queryOne<{ name: string }>('SELECT name FROM bands WHERE id = ?', [
				bandId
			]);
			if (bandRow) bandName = bandRow.name;

			// Load band persons for import
			bandPersons = await db.query<{
				id: number;
				name: string;
				role: string | null;
				member_type: string | null;
			}>(
				'SELECT id, name, role, member_type FROM persons WHERE band_id = ? AND status != ? ORDER BY name',
				[bandId, 'inactive']
			);

			// Load full person details for sharing
			bandPersonsFull = await db.query<{
				id: number;
				name: string;
				role: string | null;
				pronouns: string | null;
				phone: string | null;
				email: string | null;
				member_type: string | null;
				status: string | null;
			}>(
				'SELECT id, name, role, pronouns, phone, email, member_type, status FROM persons WHERE band_id = ? ORDER BY name',
				[bandId]
			);
		} catch (e) {
			console.error('Failed to load from DB:', e);
		}
	}

	// --- Undo / Redo with persistent PlotHistory ---
	const history = new PlotHistory(stagePlot.items, () => debouncedWrite());

	// Canvas state
	let canvasEl = $state<HTMLElement | null>(null);
	let canvasWidth = $state(stagePlot.canvas.width);
	let canvasHeight = $state(stagePlot.canvas.height);
	let canvasResizeObserver: ResizeObserver | null = null;
	let stagePlotContainer = $state<HTMLElement | null>(null);

	// Track pressed keys (Alt/Option for duplication)
	const keys = new PressedKeys();
	const isAltPressed = $derived(keys.has('Alt'));

	// --- Keyboard shortcuts using runed PressedKeys ---
	function nudgeSelected(dx: number, dy: number) {
		if (!selectedItems.length) return;
		selectedItems.forEach((el) => {
			const id = parseInt(el.dataset?.id || '0');
			const item = stagePlot.items.find((i: any) => i.id === id);
			if (!item) return;

			const newX = Math.max(0, Math.min(canvasWidth - item.position.width, item.position.x + dx));
			const newY = Math.max(0, Math.min(canvasHeight - item.position.height, item.position.y + dy));
			item.position.x = newX;
			item.position.y = newY;
		});
		commitChange();
	}

	function deleteSelected() {
		if (!selectedItems.length) return;
		const selectedIds = selectedItems.map((el: any) => parseInt(el.dataset?.id || '0'));
		stagePlot.items = stagePlot.items.filter((item: any) => !selectedIds.includes(item.id));
		clearSelections();
		commitChange();
	}

	function handleDeleteHotkey() {
		const active = document.activeElement as HTMLElement | null;
		if (active) {
			const tag = active.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) {
				return;
			}
		}
		deleteSelected();
	}

	keys.onKeys(['ArrowUp'], () => nudgeSelected(0, -1));
	keys.onKeys(['ArrowDown'], () => nudgeSelected(0, 1));
	keys.onKeys(['ArrowLeft'], () => nudgeSelected(-1, 0));
	keys.onKeys(['ArrowRight'], () => nudgeSelected(1, 0));
	keys.onKeys(['Delete'], handleDeleteHotkey);
	keys.onKeys(['Backspace'], handleDeleteHotkey);

	// --- Item Management State ---
	let selectedItems = $state<any[]>([]);
	const selectedIds = $derived(
		new Set(selectedItems.map((el: any) => el.dataset?.id).filter(Boolean))
	);
	let editingItem = $state<any>(null);
	let isAddingItem = $state(false);
	let replacingItemId = $state<number | null>(null);
	let showZones = $state(true);
	let pdfPageFormat = $state<'letter' | 'a4'>('letter');

	// Unit preference (persisted to localStorage)
	let unit = $state<UnitSystem>(
		(browser && (localStorage.getItem('stageplotter-units') as UnitSystem)) || 'imperial'
	);

	$effect(() => {
		if (browser) localStorage.setItem('stageplotter-units', unit);
	});

	// Closures around canvasWidth/canvasHeight for the imported pure functions
	function getItemZone(item: any) {
		return _getItemZone(item, canvasWidth, canvasHeight);
	}

	function getItemPosition(item: any) {
		return _getItemPosition(item, canvasWidth, canvasHeight);
	}

	function updateItemPosition(itemId: number, relativeX: number, relativeY: number) {
		const item = stagePlot.items.find((i: any) => i.id === itemId);
		if (item && canvasWidth && canvasHeight) {
			const absoluteX = relativeX + canvasWidth / 2 - item.position.width / 2;
			const absoluteY = canvasHeight - relativeY - item.position.height / 2;
			item.position.x = Math.max(0, Math.min(absoluteX, canvasWidth - item.position.width));
			item.position.y = Math.max(0, Math.min(absoluteY, canvasHeight - item.position.height));
			commitChange();
		}
	}

	$effect(() => {
		if (stagePlot.items.length > 0 && canvasWidth > 0 && canvasHeight > 0) {
			stagePlot.items.forEach((item: any) => {
				item.position.x;
				item.position.y;
				item.position.width;
				item.position.height;
			});
		}
	});

	// Rescale items proportionally when stage dimensions change
	let prevStageWidth = $state(stagePlot.stage_width);
	let prevStageDepth = $state(stagePlot.stage_depth);

	$effect(() => {
		const newW = stagePlot.stage_width;
		const newD = stagePlot.stage_depth;
		if (
			prevStageWidth > 0 &&
			prevStageDepth > 0 &&
			(newW !== prevStageWidth || newD !== prevStageDepth)
		) {
			const scaleX = newW / prevStageWidth;
			const scaleY = newD / prevStageDepth;
			for (const item of stagePlot.items) {
				item.position.x = Math.round(item.position.x * scaleX);
				item.position.y = Math.round(item.position.y * scaleY);
				// Only scale width/height for risers (image items keep their pixel size)
				if (item.type === 'riser') {
					item.position.width = Math.round(item.position.width * scaleX);
					item.position.height = Math.round(item.position.height * scaleY);
				}
			}
		}
		prevStageWidth = newW;
		prevStageDepth = newD;
		debouncedWrite();
	});

	let placingItem = $state<any>(null);
	let selecto: any;
	let justSelected = false;

	function clearSelections() {
		if (selecto && selectedItems.length > 0) {
			selectedItems = [];
			selecto.setSelectedTargets([]);
		}
	}

	// --- Navigation guards: flush pending writes before leaving ---
	beforeNavigate(async () => {
		await flushWrite();
	});

	function handleBeforeUnload() {
		// Best-effort: flush synchronously (async can't block unload)
		flushWrite();
	}

	onMount(() => {
		// Load saved state from SQLite (fire-and-forget since onMount can't be async with cleanup)
		loadFromDb();

		window.addEventListener('beforeunload', handleBeforeUnload);

		onClickOutside(
			() => canvasEl,
			(event: any) => {
				const target = event.target as HTMLElement;
				const isInInspector = target.closest('.inspector-panel');
				const isInCommandPalette = target.closest('[data-command-palette]');
				if (!isInInspector && !isInCommandPalette) {
					clearSelections();
				}
			}
		);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	// Selecto lifecycle — re-initializes when canvasEl changes (layout/tab switches)
	$effect(() => {
		const el = canvasEl;
		if (!el) {
			selecto = null;
			return;
		}

		selecto = new Selecto({
			container: el,
			selectableTargets: ['.selectable-item'],
			selectByClick: true,
			selectFromInside: false,
			toggleContinueSelect: 'shift',
			dragCondition: (e: any) => {
				const target = e.inputEvent.target;
				const item = target.closest('.selectable-item');
				return !item;
			}
		});

		selecto.on('select', (e: any) => {
			selectedItems = e.selected;
			if (e.selected.length) justSelected = true;
		});

		return () => {
			selecto?.destroy();
			selecto = null;
			selectedItems = [];
			dragging = null;
		};
	});

	$effect(() => {
		if (!browser || !canvasEl) return;
		canvasResizeObserver?.disconnect();
		canvasResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (!width || !height) return;
				if (width === canvasWidth && height === canvasHeight) return;
				canvasWidth = width;
				canvasHeight = height;
				stagePlot.canvas.width = width;
				stagePlot.canvas.height = height;
			}
		});
		canvasResizeObserver.observe(canvasEl);
		const rect = canvasEl.getBoundingClientRect();
		const initialWidth = rect.width || 1100;
		const initialHeight = rect.height || 850;
		if (initialWidth !== canvasWidth || initialHeight !== canvasHeight) {
			canvasWidth = initialWidth;
			canvasHeight = initialHeight;
			stagePlot.canvas.width = initialWidth;
			stagePlot.canvas.height = initialHeight;
		}

		return () => {
			canvasResizeObserver?.disconnect();
		};
	});

	onMount(() => {
		if (!browser) return;
		const mobileQuery = window.matchMedia('(max-width: 767px)');
		const mediumQuery = window.matchMedia('(min-width: 768px) and (max-width: 1499px)');
		const desktopQuery = window.matchMedia('(min-width: 1500px)');

		const updateLayout = () => {
			if (desktopQuery.matches) {
				layoutMode = 'desktop';
			} else if (mediumQuery.matches) {
				layoutMode = 'medium';
			} else {
				layoutMode = 'mobile';
			}
		};

		updateLayout();
		mobileQuery.addEventListener('change', updateLayout);
		mediumQuery.addEventListener('change', updateLayout);
		desktopQuery.addEventListener('change', updateLayout);

		return () => {
			mobileQuery.removeEventListener('change', updateLayout);
			mediumQuery.removeEventListener('change', updateLayout);
			desktopQuery.removeEventListener('change', updateLayout);
		};
	});

	function openAddMenu() {
		isAddingItem = true;
	}

	async function preparePlacingItem(item: any, channel: any = null) {
		const img = new Image();
		img.src = item.image;
		await new Promise((resolve) => {
			img.onload = resolve;
			img.onerror = () => resolve(undefined);
		});
		placingItem = {
			type: item.type ?? item.item_type ?? 'input',
			itemData: item,
			width: img.naturalWidth || 80,
			height: img.naturalHeight || 60,
			x: -1000,
			y: -1000,
			channel
		};
	}

	async function handleItemSelect(item: any) {
		if (replacingItemId != null) {
			await handleReplaceItem(item);
			return;
		}
		isAddingItem = false;
		await preparePlacingItem(item);
	}

	function openReplaceMenu(itemId: number) {
		replacingItemId = itemId;
		isAddingItem = true;
	}

	async function handleReplaceItem(newItemData: any) {
		const targetId = replacingItemId;
		replacingItemId = null;
		isAddingItem = false;
		if (targetId == null) return;

		const idx = stagePlot.items.findIndex((i: any) => i.id === targetId);
		if (idx === -1) return;

		const existing = stagePlot.items[idx];
		const img = new Image();
		img.src = newItemData.image;
		await new Promise((resolve) => {
			img.onload = resolve;
			img.onerror = () => resolve(undefined);
		});
		const newWidth = img.naturalWidth || 80;
		const newHeight = img.naturalHeight || 60;

		stagePlot.items[idx] = {
			...existing,
			type: newItemData.type ?? newItemData.item_type ?? 'input',
			itemData: newItemData,
			name: newItemData.name || '',
			currentVariant: 'default',
			position: {
				...existing.position,
				width: newWidth,
				height: newHeight
			}
		};
		commitChange();
	}

	function handleCanvasMouseMove(event: MouseEvent) {
		if (placingItem && canvasEl) {
			const rect = canvasEl.getBoundingClientRect();
			let x = event.clientX - rect.left - placingItem.width / 2;
			let y = event.clientY - rect.top - placingItem.height / 2;
			const snapped = snapToGrid(x, y, placingItem.width, placingItem.height);
			placingItem.x = snapped.x;
			placingItem.y = snapped.y;
		}
	}

	function handleCanvasClick(event: MouseEvent) {
		if (justSelected) {
			justSelected = false;
			return;
		}
		if (placingItem && canvasEl) {
			const rect = canvasEl.getBoundingClientRect();
			const rawX = event.clientX - rect.left - placingItem.width / 2;
			const rawY = event.clientY - rect.top - placingItem.height / 2;
			const snapped = snapToGrid(rawX, rawY, placingItem.width, placingItem.height);

			const newItem: any = {
				id: Date.now(),
				type: placingItem.type,
				itemData: placingItem.itemData,
				currentVariant: 'default',
				position: {
					width: placingItem.width,
					height: placingItem.height,
					x: Math.max(0, Math.min(snapped.x, canvasWidth - placingItem.width)),
					y: Math.max(0, Math.min(snapped.y, canvasHeight - placingItem.height))
				},
				name: placingItem.itemData?.name || '',
				channel: '',
				person_id: placingItem.person_id ?? null
			};

			let ch = placingItem.channel;
			if (ch == null && placingItem.type === 'input') {
				ch = getNextAvailableChannel();
			}
			newItem.channel = ch != null ? String(ch) : '';
			stagePlot.items.push(newItem);

			const isMonitor = isMonitorItem(placingItem.itemData);
			const defaultInputs = isMonitor ? null : placingItem.itemData?.default_inputs;
			if (defaultInputs && Array.isArray(defaultInputs)) {
				defaultInputs.forEach((inputDef: any, idx: number) => {
					stagePlot.items.push({
						id: Date.now() + idx + 1,
						type: 'input',
						itemData: {
							...inputDef,
							item_type: 'input',
							name: inputDef.name,
							category: 'Input',
							path: ''
						},
						name: inputDef.name,
						channel: String(inputDef.ch || ''),
						person_id: null,
						currentVariant: 'default',
						position: { width: 0, height: 0, x: 0, y: 0 }
					});
				});
			}

			addDefaultOutputs(placingItem.itemData);

			placingItem = null;
			commitChange();
		} else {
			const target = event.target as HTMLElement;
			const clickedItem = target.closest('.selectable-item');
			if (!clickedItem) {
				clearSelections();
			}
		}
	}

	function selectItemByIndex(index: number) {
		if (stagePlot.items.length === 0) return;
		const item = stagePlot.items[index];
		if (!item) return;
		const el = canvasEl?.querySelector(`[data-id="${item.id}"]`) as HTMLElement | null;
		if (!el) return;
		clearSelections();
		selectedItems = [el];
		selecto?.setSelectedTargets([el]);
		el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			openAddMenu();
		}
		if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
			event.preventDefault();
			history.undo();
			return;
		}
		if (
			(event.metaKey || event.ctrlKey) &&
			((event.key === 'z' && event.shiftKey) || event.key === 'y')
		) {
			event.preventDefault();
			history.redo();
			return;
		}
		if (event.key === 'Escape') {
			placingItem = null;
			clearSelections();
		}
		if (event.key === 'Tab') {
			const active = document.activeElement as HTMLElement | null;
			if (
				active &&
				(active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
			)
				return;
			if (layoutMode === 'medium') {
				event.preventDefault();
				mediumMainTab = mediumMainTab === 'canvas' ? 'patch' : 'canvas';
				return;
			}
			if (layoutMode === 'mobile') {
				event.preventDefault();
				const order: Array<'canvas' | 'patch' | 'panel'> = ['canvas', 'patch', 'panel'];
				const currentIndex = order.indexOf(mobileMainTab);
				const delta = event.shiftKey ? -1 : 1;
				const nextIndex = (currentIndex + delta + order.length) % order.length;
				mobileMainTab = order[nextIndex];
				return;
			}
		}
	}

	function deleteItem(id: number) {
		const index = stagePlot.items.findIndex((item: any) => item.id === id);
		if (index !== -1) {
			stagePlot.items.splice(index, 1);
			commitChange();
		}
	}

	function duplicateItem(sourceItem: any, overrides: any = {}) {
		if (!sourceItem) return;
		const newItem = {
			...sourceItem,
			id: Date.now(),
			position: { ...sourceItem.position },
			itemData: sourceItem.itemData ? { ...sourceItem.itemData } : undefined,
			...overrides
		};
		if (!overrides.position) {
			newItem.position.x = Math.min(
				sourceItem.position.x + 20,
				canvasWidth - sourceItem.position.width
			);
			newItem.position.y = Math.min(
				sourceItem.position.y + 20,
				canvasHeight - sourceItem.position.height
			);
		}
		stagePlot.items.push(newItem);
		commitChange();
	}

	function moveToFront(itemId: number) {
		const idx = stagePlot.items.findIndex((i: any) => i.id === itemId);
		if (idx === -1 || idx === stagePlot.items.length - 1) return;
		const [item] = stagePlot.items.splice(idx, 1);
		stagePlot.items.push(item);
		commitChange();
	}

	function moveToBack(itemId: number) {
		const idx = stagePlot.items.findIndex((i: any) => i.id === itemId);
		if (idx <= 0) return;
		const [item] = stagePlot.items.splice(idx, 1);
		stagePlot.items.unshift(item);
		commitChange();
	}

	function moveForward(itemId: number) {
		const idx = stagePlot.items.findIndex((i: any) => i.id === itemId);
		if (idx === -1 || idx === stagePlot.items.length - 1) return;
		[stagePlot.items[idx], stagePlot.items[idx + 1]] = [
			stagePlot.items[idx + 1],
			stagePlot.items[idx]
		];
		commitChange();
	}

	function moveBackward(itemId: number) {
		const idx = stagePlot.items.findIndex((i: any) => i.id === itemId);
		if (idx <= 0) return;
		[stagePlot.items[idx - 1], stagePlot.items[idx]] = [
			stagePlot.items[idx],
			stagePlot.items[idx - 1]
		];
		commitChange();
	}

	function openItemEditor(item: any, event: any) {
		if (justSelected) {
			justSelected = false;
			return;
		}
		event.stopPropagation();
		const itemEl = document.querySelector(`[data-id="${item.id}"]`);
		if (itemEl) {
			selectedItems = [itemEl as HTMLElement];
			selecto?.setSelectedTargets([itemEl]);
			(itemEl as HTMLElement).scrollIntoView({
				block: 'nearest',
				inline: 'nearest',
				behavior: 'smooth'
			});
		}
	}

	async function addPersonToPlot(personId: number, silhouetteItem: ProcessedItem) {
		// Insert into plot_persons
		await db.run('INSERT OR IGNORE INTO plot_persons (plot_id, person_id) VALUES (?, ?)', [
			plotId,
			personId
		]);
		plotPersonIds = new Set([...plotPersonIds, personId]);

		// Reload plot persons
		plotPersons = await db.query<{ id: number; name: string; role: string | null }>(
			`SELECT p.id, p.name, p.role FROM persons p
			 INNER JOIN plot_persons pp ON pp.person_id = p.id
			 WHERE pp.plot_id = ?
			 ORDER BY p.name`,
			[plotId]
		);

		// Place silhouette on canvas
		await preparePlacingItem(silhouetteItem);
		if (placingItem) {
			placingItem.person_id = personId;
		}
	}

	async function createPerson(name: string): Promise<number> {
		const result = await db.run(
			'INSERT INTO persons (band_id, name, member_type, status) VALUES (?, ?, ?, ?)',
			[bandId, name, 'performer', 'permanent']
		);
		const personId = result.lastInsertRowid;

		// Refresh band persons list
		bandPersons = await db.query<{
			id: number;
			name: string;
			role: string | null;
			member_type: string | null;
		}>(
			'SELECT id, name, role, member_type FROM persons WHERE band_id = ? AND status != ? ORDER BY name',
			[bandId, 'inactive']
		);

		return personId;
	}

	async function removePersonFromPlot(personId: number) {
		await db.run('DELETE FROM plot_persons WHERE plot_id = ? AND person_id = ?', [
			plotId,
			personId
		]);
		const next = new Set(plotPersonIds);
		next.delete(personId);
		plotPersonIds = next;
		plotPersons = plotPersons.filter((p) => p.id !== personId);
	}

	// Pointer-based drag state
	let dragging = $state<{
		item: any;
		offsetX: number;
		offsetY: number;
		startX: number;
		startY: number;
		ghostX: number;
		ghostY: number;
		moved: boolean;
		group: Array<{ item: any; startX: number; startY: number }>;
	} | null>(null);

	function handleItemPointerDown(event: PointerEvent, item: any) {
		if (event.button !== 0) return;
		if (placingItem) return;
		if ((event.target as HTMLElement).closest('button')) return;

		const el = event.currentTarget as HTMLElement;
		el.setPointerCapture(event.pointerId);

		const canvasRect = canvasEl!.getBoundingClientRect();

		// Build group of all selected items (if dragged item is in selection)
		const isInSelection = selectedIds.has(String(item.id));
		let group: Array<{ item: any; startX: number; startY: number }>;
		if (isInSelection && selectedItems.length > 1) {
			group = selectedItems
				.map((el) => {
					const id = parseInt(el.dataset?.id || '0');
					const groupItem = stagePlot.items.find((i: any) => i.id === id);
					return groupItem
						? { item: groupItem, startX: groupItem.position.x, startY: groupItem.position.y }
						: null;
				})
				.filter(Boolean) as Array<{ item: any; startX: number; startY: number }>;
		} else {
			group = [{ item, startX: item.position.x, startY: item.position.y }];
		}

		dragging = {
			item,
			offsetX: event.clientX - canvasRect.left - item.position.x,
			offsetY: event.clientY - canvasRect.top - item.position.y,
			startX: item.position.x,
			startY: item.position.y,
			ghostX: item.position.x,
			ghostY: item.position.y,
			moved: false,
			group
		};
	}

	function handleItemPointerMove(event: PointerEvent) {
		if (!dragging || !canvasEl) return;

		const canvasRect = canvasEl.getBoundingClientRect();
		const rawX = event.clientX - canvasRect.left - dragging.offsetX;
		const rawY = event.clientY - canvasRect.top - dragging.offsetY;

		if (!dragging.moved) {
			const dx = rawX - dragging.startX;
			const dy = rawY - dragging.startY;
			if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
			dragging.moved = true;
		}

		const deltaX = rawX - dragging.startX;
		const deltaY = rawY - dragging.startY;

		if (isAltPressed) {
			// Alt+drag: keep original in place, move ghost (single item only)
			dragging.item.position.x = dragging.startX;
			dragging.item.position.y = dragging.startY;
			const clampedX = Math.max(0, Math.min(rawX, canvasWidth - dragging.item.position.width));
			const clampedY = Math.max(0, Math.min(rawY, canvasHeight - dragging.item.position.height));
			dragging.ghostX = clampedX;
			dragging.ghostY = clampedY;
		} else {
			// Normal drag: move all items in the group
			for (const entry of dragging.group) {
				const newX = entry.startX + deltaX;
				const newY = entry.startY + deltaY;
				entry.item.position.x = Math.max(
					0,
					Math.min(newX, canvasWidth - entry.item.position.width)
				);
				entry.item.position.y = Math.max(
					0,
					Math.min(newY, canvasHeight - entry.item.position.height)
				);
			}
		}
	}

	function handleItemPointerUp(event: PointerEvent) {
		if (!dragging) return;

		if (dragging.moved) {
			if (isAltPressed) {
				// Alt+drag: duplicate single item only
				const snapped = snapToGrid(
					dragging.ghostX,
					dragging.ghostY,
					dragging.item.position.width,
					dragging.item.position.height
				);
				const x = Math.max(0, Math.min(snapped.x, canvasWidth - dragging.item.position.width));
				const y = Math.max(0, Math.min(snapped.y, canvasHeight - dragging.item.position.height));
				duplicateItem(dragging.item, { position: { ...dragging.item.position, x, y } });
			} else {
				// Snap all items in the group
				for (const entry of dragging.group) {
					const snapped = snapToGrid(
						entry.item.position.x,
						entry.item.position.y,
						entry.item.position.width,
						entry.item.position.height
					);
					const x = Math.max(0, Math.min(snapped.x, canvasWidth - entry.item.position.width));
					const y = Math.max(0, Math.min(snapped.y, canvasHeight - entry.item.position.height));
					entry.item.position.x = x;
					entry.item.position.y = y;
				}
				commitChange();
			}
			justSelected = true;
		}

		dragging = null;
	}

	function rotateItemRight(item: any) {
		const variants = getItemVariants(item);
		if (!variants) return;
		const variantKeys = getVariantKeys(item);
		const currentIndex = variantKeys.indexOf(item.currentVariant || 'default');
		const newIndex = (currentIndex + 1) % variantKeys.length;
		item.currentVariant = variantKeys[newIndex];
		const newImagePath = variants[item.currentVariant];
		const img = new Image();
		img.src = buildImagePath(item, newImagePath);
		img.onload = () => {
			item.position.width = img.naturalWidth;
			item.position.height = img.naturalHeight;
			commitChange();
		};
		updateItemProperty(item.id, 'currentVariant', item.currentVariant);
	}

	function handlePatchItemUpdate(itemId: number, property: string, value: string) {
		const item = stagePlot.items.find((i: any) => i.id === itemId);
		if (item) {
			(item as any)[property] = value;
			commitChange();
		}
	}

	function updateItemProperty(itemId: number, property: string, value: string) {
		const item = stagePlot.items.find((i: any) => i.id === itemId);
		if (!item) return;
		// Handle riser dimension properties stored in itemData
		if (['riserWidth', 'riserDepth', 'riserHeight'].includes(property)) {
			if (!item.itemData) item.itemData = {};
			item.itemData[property] = parseFloat(value);
			if (property === 'riserWidth') {
				item.position.width = feetToPixels(parseFloat(value));
			} else if (property === 'riserDepth') {
				item.position.height = feetToPixels(parseFloat(value));
			}
		} else if (property === 'person_id') {
			item.person_id = value ? parseInt(value) : null;
		} else {
			(item as any)[property] = value;
		}
		commitChange();
	}

	function handlePatchReorder(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) return;
		if (
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= stagePlot.items.length ||
			toIndex >= stagePlot.items.length
		)
			return;
		const [moved] = stagePlot.items.splice(fromIndex, 1);
		stagePlot.items.splice(toIndex, 0, moved);
		commitChange();
	}

	function getNextAvailableChannel() {
		const used = new Set(
			stagePlot.items.filter((i: any) => i.channel).map((i: any) => parseInt(i.channel))
		);
		let ch = 1;
		while (used.has(ch)) ch++;
		return ch;
	}

	function getUsedOutputChannels() {
		return new Set(
			stagePlot.outputs.filter((o: any) => o.channel).map((o: any) => parseInt(o.channel))
		);
	}

	function getNextAvailableOutputChannel(start = 1) {
		const used = getUsedOutputChannels();
		for (let ch = start; ch <= outputChannelMode; ch++) {
			if (!used.has(ch)) return ch;
		}
		return null;
	}

	function getNextAvailableOutputStereoStart() {
		const used = getUsedOutputChannels();
		for (let ch = 1; ch < outputChannelMode; ch++) {
			if (ch % 2 === 0) continue;
			if (!used.has(ch) && !used.has(ch + 1)) return ch;
		}
		return null;
	}

	function isMonitorItem(itemData: any) {
		const category = (itemData?.category ?? '').toString().toLowerCase();
		const path = (itemData?.path ?? '').toString().toLowerCase();
		return (
			category.includes('monitor') ||
			path.startsWith('monitors/') ||
			path.startsWith('outputs/monitors')
		);
	}

	function inferOutputType(itemData: any) {
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

	function inferOutputLinkMode(itemData: any) {
		const path = (itemData?.path ?? '').toString().toLowerCase();
		if (path.includes('inear') || path.includes('sidefill')) return 'stereo_pair';
		return 'mono';
	}

	function addDefaultOutputs(itemData: any) {
		const defaults = itemData?.default_outputs;
		const derivedDefaults = isMonitorItem(itemData)
			? [
					{
						name: itemData?.name || 'Monitor',
						type: inferOutputType(itemData),
						link_mode: inferOutputLinkMode(itemData)
					}
				]
			: [];
		const outputs = Array.isArray(defaults) && defaults.length > 0 ? defaults : derivedDefaults;
		if (!outputs.length) return;

		outputs.forEach((outputDef: any, idx: number) => {
			const linkMode = outputDef?.link_mode ?? inferOutputLinkMode(itemData);
			const baseName = outputDef?.name || itemData?.name || 'Output';
			if (linkMode === 'stereo_pair') {
				const start = getNextAvailableOutputStereoStart();
				if (start == null) return;
				stagePlot.outputs = stagePlot.outputs.filter(
					(o: any) => o.channel !== String(start) && o.channel !== String(start + 1)
				);
				stagePlot.outputs.push(
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
				outputStereoLinks = Array.from(new Set([...outputStereoLinks, start])).sort(
					(a, b) => a - b
				);
			} else {
				const ch = getNextAvailableOutputChannel();
				if (ch == null) return;
				stagePlot.outputs = stagePlot.outputs.filter((o: any) => o.channel !== String(ch));
				stagePlot.outputs.push({
					id: Date.now() + idx,
					name: baseName,
					channel: String(ch),
					itemData,
					link_mode: linkMode
				});
			}
		});
		debouncedWrite();
	}

	function handlePatchAddItem(item: any, channel: number) {
		stagePlot.items = stagePlot.items.filter((i: any) => i.channel !== String(channel));
		// Auto-apply category color when placing an item
		if (consoleType && item.category) {
			const colorCat = CATALOG_TO_COLOR_CATEGORY[item.category] as ColorCategory | undefined;
			if (colorCat && categoryColorDefaults[colorCat]) {
				channelColors = { ...channelColors, [channel]: categoryColorDefaults[colorCat] };
				debouncedWrite();
			}
		}
		preparePlacingItem(item, channel);
	}

	function handlePatchRemoveItem(channel: number) {
		stagePlot.items = stagePlot.items.filter((i: any) => i.channel !== String(channel));
		commitChange();
	}

	function handleClearPatch() {
		for (const item of stagePlot.items) {
			item.channel = '';
			item.musician = '';
		}
		commitChange();
	}

	function handlePatchOutputSelect(item: any, channel: number) {
		stagePlot.outputs = stagePlot.outputs.filter((o: any) => o.channel !== String(channel));
		if (item) {
			stagePlot.outputs.push({
				id: Date.now(),
				name: item.name,
				channel: String(channel),
				itemData: item
			});
		}
		debouncedWrite();
	}

	function handlePatchOutputRemove(channel: number) {
		stagePlot.outputs = stagePlot.outputs.filter((o: any) => o.channel !== String(channel));
		debouncedWrite();
	}

	// Console settings handlers
	function handleConsoleTypeChange(newType: string | null) {
		consoleType = newType;
		// Initialize category defaults when console is first set
		if (newType && Object.keys(categoryColorDefaults).length === 0) {
			categoryColorDefaults = getDefaultCategoryColors(newType) as Record<string, string>;
		}
		debouncedWrite();
	}

	function handleChannelColorChange(channel: number, colorId: string) {
		channelColors = { ...channelColors, [channel]: colorId };
		debouncedWrite();
	}

	function handleStereoLinksChange(links: number[]) {
		stereoLinks = links;
		debouncedWrite();
	}

	function handleOutputStereoLinksChange(links: number[]) {
		outputStereoLinks = links;
		debouncedWrite();
	}

	function handleCategoryColorDefaultsChange(defaults: Record<string, string>) {
		categoryColorDefaults = defaults;
		debouncedWrite();
	}

	function snapToGrid(x: number, y: number, w: number, h: number) {
		return _snapToGrid(x, y, w, h, snapping, canvasWidth, canvasHeight);
	}

	function placeRiser(riserWidth: number, riserDepth: number, riserHeight: number) {
		const pxW = feetToPixels(riserWidth);
		const pxH = feetToPixels(riserDepth);
		placingItem = {
			type: 'riser',
			itemData: {
				name: `Riser ${riserWidth}'×${riserDepth}'`,
				item_type: 'riser',
				riserWidth,
				riserDepth,
				riserHeight
			},
			width: pxW,
			height: pxH,
			x: -1000,
			y: -1000
		};
	}

	async function handleExportPdf() {
		if (!canvasEl) return;
		await exportToPdf({
			plotName: stagePlot.plot_name,
			canvasEl,
			items: stagePlot.items.map((i: any) => ({
				name: i.name,
				channel: i.channel,
				person_name: i.person_id ? personsById[i.person_id]?.name || '' : ''
			})),
			persons: plotPersons.map((p) => ({ name: p.name, role: p.role || '' })),
			pageFormat: pdfPageFormat
		});
	}

	function handleImportComplete() {
		clearSelections();
		placingItem = null;
		editingItem = null;
		commitChange();
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="flex h-[calc(100dvh-4.25rem)] flex-col gap-3 overflow-hidden">
	<div class="shrink-0">
		<EditorToolbar
			bind:title={stagePlot.plot_name}
			bind:revisionDate={stagePlot.revision_date}
			onAddItem={openAddMenu}
			onImportComplete={handleImportComplete}
			onExportPdf={handleExportPdf}
			backHref={'/bands/' + bandId}
			bind:items={stagePlot.items}
			musicians={plotPersons.map((p) => ({ id: p.id, name: p.name, instrument: p.role || '' }))}
			bind:canvasWidth
			bind:canvasHeight
			bind:lastModified={stagePlot.revision_date}
			{getItemZone}
			{getItemPosition}
			onTitleChange={() => debouncedWrite()}
			onRevisionDateChange={() => debouncedWrite()}
			{bandName}
			persons={bandPersonsFull}
			stageWidth={stagePlot.stage_width}
			stageDepth={stagePlot.stage_depth}
			{consoleType}
			{channelColors}
			{stereoLinks}
		/>
	</div>

	{#snippet patchContent(columnCount: number)}
		<StagePatch
			items={stagePlot.items}
			outputs={stagePlot.outputs}
			{columnCount}
			onUpdateItem={handlePatchItemUpdate}
			onReorderPatch={handlePatchReorder}
			onSelectItem={openItemEditor}
			onAddItem={handlePatchAddItem}
			onRemoveItem={handlePatchRemoveItem}
			onClearPatch={handleClearPatch}
			onOutputSelect={handlePatchOutputSelect}
			onOutputRemove={handlePatchOutputRemove}
			{consoleType}
			{channelColors}
			onChannelColorChange={handleChannelColorChange}
			{stereoLinks}
			onStereoLinksChange={handleStereoLinksChange}
			{outputStereoLinks}
			onOutputStereoLinksChange={handleOutputStereoLinksChange}
			{categoryColorDefaults}
			{inputChannelMode}
			{outputChannelMode}
		/>
	{/snippet}

	{#snippet canvasContent()}
		<div class="border border-border-primary bg-surface p-3 shadow-sm">
			<ContextMenu.Root>
				<ContextMenu.Trigger>
					{#snippet child({ props: canvasCtxProps })}
						<div
							{...canvasCtxProps}
							bind:this={canvasEl}
							class="items-container relative mx-auto w-full bg-white dark:bg-gray-800"
							style="aspect-ratio: {stagePlot.stage_width}/{stagePlot.stage_depth}; max-width: 1100px; cursor: {placingItem
								? 'copy'
								: 'default'}"
							onmousemove={handleCanvasMouseMove}
							onclick={handleCanvasClick}
						>
							<CanvasOverlay
								{showZones}
								{canvasWidth}
								{canvasHeight}
								itemCount={stagePlot.items.length}
							/>

							{#each stagePlot.items as item (item.id)}
								<ContextMenu.Root>
									<ContextMenu.Trigger>
										{#snippet child({ props: itemProps })}
											<div
												{...itemProps}
												class="group selectable-item absolute cursor-move select-none"
												class:ring-2={editingItem?.id === item.id ||
													selectedIds.has(String(item.id))}
												class:ring-blue-500={editingItem?.id === item.id ||
													selectedIds.has(String(item.id))}
												data-id={item.id}
												style="left: {item.position.x}px; top: {item.position.y}px; width: {item
													.position.width}px; height: {item.position.height}px; touch-action: none;"
												draggable="false"
												ondragstart={(e) => e.preventDefault()}
												onpointerdown={(e) => handleItemPointerDown(e, item)}
												onpointermove={handleItemPointerMove}
												onpointerup={handleItemPointerUp}
												onclick={(e) => openItemEditor(item, e)}
											>
												{#if item.type === 'stageDeck'}
													<StageDeck size={item.size} x={0} y={0} class="h-full w-full" />
												{:else if item.type === 'riser'}
													<div
														class="flex h-full w-full items-center justify-center rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50"
													>
														<div class="text-center leading-tight">
															<div class="text-[10px] font-bold text-gray-700 dark:text-gray-200">
																RISER
															</div>
															<div class="text-[8px] text-gray-600 dark:text-gray-300">
																{item.itemData?.riserWidth ?? '?'}' × {item.itemData?.riserDepth ??
																	'?'}'
															</div>
															{#if item.itemData?.riserHeight}
																<div class="text-[7px] text-gray-500 dark:text-gray-400">
																	h: {item.itemData.riserHeight}'
																</div>
															{/if}
														</div>
													</div>
												{:else}
													<img
														src={getCurrentImageSrc(item)}
														alt={item.itemData?.name || item.name || 'Stage Item'}
														draggable="false"
														style="width: {item.position.width}px; height: {item.position
															.height}px; pointer-events: none;"
													/>
												{/if}

												{#if item.person_id && item.itemData?.item_type === 'person'}
													{@const person = personsById[item.person_id]}
													{#if person}
														<div
															class="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-gray-800 shadow-sm dark:bg-gray-800/90 dark:text-gray-200"
														>
															{person.name}
														</div>
													{/if}
												{/if}

												{#if selectedItems.some((el) => el.dataset?.id === String(item.id))}
													{#if getVariantKeys(item).length > 1}
														<div
															class="absolute -bottom-8 left-1/2 z-20 flex -translate-x-1/2 transform gap-1"
														>
															<button
																onclick={(e) => {
																	e.stopPropagation();
																	rotateItemRight(item);
																}}
																class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white shadow-md transition-colors hover:bg-blue-600"
																title="Rotate Right"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	class="h-4 w-4"
																	viewBox="0 0 20 20"
																	fill="currentColor"
																>
																	<path
																		fill-rule="evenodd"
																		d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
																		clip-rule="evenodd"
																	/>
																</svg>
															</button>
														</div>
													{/if}
												{/if}

												<button
													onclick={(e) => {
														e.stopPropagation();
														deleteItem(item.id);
													}}
													class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
												>
													&times;
												</button>
											</div>
										{/snippet}
									</ContextMenu.Trigger>
									<ContextMenu.Portal>
										<ContextMenu.Content
											class="z-50 w-[200px] rounded-xl border border-gray-300 bg-white px-1 py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800"
										>
											<ContextMenu.Item
												onSelect={() => openReplaceMenu(item.id)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
												>Replace...</ContextMenu.Item
											>
											<ContextMenu.Item
												onSelect={() => duplicateItem(item)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
												>Duplicate</ContextMenu.Item
											>
											<ContextMenu.Separator class="-mx-1 my-1 block h-px bg-muted" />
											<ContextMenu.Item
												onSelect={() => moveToFront(item.id)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
												>Bring to Front</ContextMenu.Item
											>
											<ContextMenu.Item
												onSelect={() => moveForward(item.id)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
												>Bring Forward</ContextMenu.Item
											>
											<ContextMenu.Item
												onSelect={() => moveBackward(item.id)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
												>Send Backward</ContextMenu.Item
											>
											<ContextMenu.Item
												onSelect={() => moveToBack(item.id)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
												>Send to Back</ContextMenu.Item
											>
											<ContextMenu.Separator class="-mx-1 my-1 block h-px bg-muted" />
											<ContextMenu.Item
												onSelect={() => deleteItem(item.id)}
												class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-600/30"
												>Delete</ContextMenu.Item
											>
										</ContextMenu.Content>
									</ContextMenu.Portal>
								</ContextMenu.Root>
							{/each}

							{#if dragging?.moved && isAltPressed}
								<div
									class="ring-dashed pointer-events-none absolute opacity-50 ring-2 ring-blue-400"
									style="left: {dragging.ghostX}px; top: {dragging.ghostY}px; width: {dragging.item
										.position.width}px; height: {dragging.item.position.height}px;"
								>
									{#if dragging.item.type === 'stageDeck'}
										<StageDeck size={dragging.item.size} x={0} y={0} class="h-full w-full" />
									{:else if dragging.item.type === 'riser'}
										<div
											class="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-gray-500 bg-gray-400/40 text-[10px] font-bold text-gray-700"
										>
											RISER
										</div>
									{:else}
										<img
											src={getCurrentImageSrc(dragging.item)}
											alt="Duplicate preview"
											draggable="false"
											style="width: {dragging.item.position.width}px; height: {dragging.item
												.position.height}px; pointer-events: none;"
										/>
									{/if}
								</div>
							{/if}

							{#if placingItem}
								<div
									class="pointer-events-none absolute opacity-60"
									style="left: {placingItem.x}px; top: {placingItem.y}px; width: {placingItem.width}px; height: {placingItem.height}px;"
								>
									{#if placingItem.type === 'riser'}
										<div
											class="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-gray-500 bg-gray-400/40 text-[10px] font-bold text-gray-700"
										>
											RISER
										</div>
									{:else}
										<img
											src={placingItem.itemData?.image || ''}
											alt={placingItem.itemData?.name || 'Item Preview'}
											style="width: {placingItem.width}px; height: {placingItem.height}px;"
										/>
									{/if}
								</div>
							{/if}
						</div>
					{/snippet}
				</ContextMenu.Trigger>
				<ContextMenu.Portal>
					<ContextMenu.Content
						class="z-50 w-[200px] rounded-xl border border-gray-300 bg-white px-1 py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800"
					>
						<ContextMenu.Item
							onSelect={() => openAddMenu()}
							class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
							>Add Item</ContextMenu.Item
						>
						<ContextMenu.Item
							onSelect={() => (snapping = !snapping)}
							class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
							>Snapping: {snapping ? 'On' : 'Off'}</ContextMenu.Item
						>
					</ContextMenu.Content>
				</ContextMenu.Portal>
			</ContextMenu.Root>
		</div>

		<div class="mt-1.5 flex justify-between text-xs text-text-tertiary">
			<div class="flex items-center gap-3">
				Items: {stagePlot.items.length} | People: {plotPersonIds.size}
				{#if isAltPressed}
					<span class="animate-bounce font-semibold text-blue-600">(Duplicate)</span>
				{/if}
			</div>
			<div>
				{#if placingItem}Click on canvas to place item. Press 'Escape' to cancel.{/if}
			</div>
		</div>
	{/snippet}

	{#if layoutMode === 'desktop'}
		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<div
				class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
				bind:this={stagePlotContainer}
			>
				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					{@render canvasContent()}
				</div>

				<div class="min-h-0 flex-1 overflow-hidden">
					{@render patchContent(6)}
				</div>
			</div>

			<div class="flex w-80 shrink-0 flex-col overflow-hidden">
				<EditorSidePanel
					bind:activeTab={sidePanelTab}
					bind:selectedItems
					bind:items={stagePlot.items}
					persons={plotPersons}
					bind:title={stagePlot.plot_name}
					bind:lastModified={stagePlot.revision_date}
					bind:showZones
					bind:stageWidth={stagePlot.stage_width}
					bind:stageDepth={stagePlot.stage_depth}
					bind:unit
					bind:pdfPageFormat
					onPlaceRiser={placeRiser}
					onUpdateItem={updateItemProperty}
					{getItemZone}
					{getItemPosition}
					{updateItemPosition}
					{bandPersons}
					{plotPersonIds}
					onAddPersonToPlot={addPersonToPlot}
					onCreatePerson={createPerson}
					onRemovePersonFromPlot={removePersonFromPlot}
					{consoleType}
					{consoleDef}
					{consoleOptions}
					{categoryColorDefaults}
					{inputChannelMode}
					{outputChannelMode}
					channelOptions={consoleDef?.channelOptions ?? CHANNEL_OPTIONS}
					outputOptions={consoleDef?.outputOptions ?? CHANNEL_OPTIONS}
					onConsoleTypeChange={handleConsoleTypeChange}
					onCategoryColorDefaultsChange={handleCategoryColorDefaultsChange}
					onInputChannelModeChange={(m) => (inputChannelMode = m as ChannelMode)}
					onOutputChannelModeChange={(m) => (outputChannelMode = m as ChannelMode)}
				/>
			</div>
		</div>
	{:else if layoutMode === 'medium'}
		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<div
				class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
				bind:this={stagePlotContainer}
			>
				<div
					class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm"
				>
					<div class="border-b border-border-primary bg-muted/30 px-0 pt-0">
						<div class="flex w-full">
							<button
								type="button"
								onclick={() => (mediumMainTab = 'canvas')}
								class={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium transition-colors ${mediumMainTab === 'canvas' ? 'border-text-primary bg-surface text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
							>
								Canvas
							</button>
							<button
								type="button"
								onclick={() => (mediumMainTab = 'patch')}
								class={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium transition-colors ${mediumMainTab === 'patch' ? 'border-text-primary bg-surface text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
							>
								Patch List
							</button>
						</div>
					</div>
					{#if mediumMainTab === 'canvas'}
						<div class="min-h-0 flex-1 overflow-hidden p-4">
							{@render canvasContent()}
						</div>
					{:else}
						<div class="min-h-0 flex-1 overflow-hidden p-4">
							{@render patchContent(4)}
						</div>
					{/if}
				</div>
			</div>

			<div class="flex w-80 shrink-0 flex-col">
				<EditorSidePanel
					bind:activeTab={sidePanelTab}
					bind:selectedItems
					bind:items={stagePlot.items}
					persons={plotPersons}
					bind:title={stagePlot.plot_name}
					bind:lastModified={stagePlot.revision_date}
					bind:showZones
					bind:stageWidth={stagePlot.stage_width}
					bind:stageDepth={stagePlot.stage_depth}
					bind:unit
					bind:pdfPageFormat
					onPlaceRiser={placeRiser}
					onUpdateItem={updateItemProperty}
					{getItemZone}
					{getItemPosition}
					{updateItemPosition}
					{bandPersons}
					{plotPersonIds}
					onAddPersonToPlot={addPersonToPlot}
					onCreatePerson={createPerson}
					onRemovePersonFromPlot={removePersonFromPlot}
					{consoleType}
					{consoleDef}
					{consoleOptions}
					{categoryColorDefaults}
					{inputChannelMode}
					{outputChannelMode}
					channelOptions={consoleDef?.channelOptions ?? CHANNEL_OPTIONS}
					outputOptions={consoleDef?.outputOptions ?? CHANNEL_OPTIONS}
					onConsoleTypeChange={handleConsoleTypeChange}
					onCategoryColorDefaultsChange={handleCategoryColorDefaultsChange}
					onInputChannelModeChange={(m) => (inputChannelMode = m as ChannelMode)}
					onOutputChannelModeChange={(m) => (outputChannelMode = m as ChannelMode)}
				/>
			</div>
		</div>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
			<div
				class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm"
			>
				<div class="border-b border-border-primary bg-muted/30 px-0 pt-0">
					<div class="flex w-full">
						<button
							type="button"
							onclick={() => (mobileMainTab = 'canvas')}
							class={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium transition-colors ${mobileMainTab === 'canvas' ? 'border-text-primary bg-surface text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
						>
							Canvas
						</button>
						<button
							type="button"
							onclick={() => (mobileMainTab = 'patch')}
							class={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium transition-colors ${mobileMainTab === 'patch' ? 'border-text-primary bg-surface text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
						>
							Patch List
						</button>
						<button
							type="button"
							onclick={() => (mobileMainTab = 'panel')}
							class={`flex-1 border-b-2 px-4 py-3 text-center text-sm font-medium transition-colors ${mobileMainTab === 'panel' ? 'border-text-primary bg-surface text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
						>
							Panel
						</button>
					</div>
				</div>
				{#if mobileMainTab === 'canvas'}
					<div class="min-h-0 flex-1 overflow-hidden p-4">
						{@render canvasContent()}
					</div>
				{:else if mobileMainTab === 'patch'}
					<div class="min-h-0 flex-1 overflow-hidden p-4">
						{@render patchContent(4)}
					</div>
				{:else}
					<div class="min-h-0 flex-1 overflow-hidden p-4">
						<EditorSidePanel
							bind:activeTab={mobilePanelTab}
							bind:selectedItems
							bind:items={stagePlot.items}
							persons={plotPersons}
							bind:title={stagePlot.plot_name}
							bind:lastModified={stagePlot.revision_date}
							bind:showZones
							bind:stageWidth={stagePlot.stage_width}
							bind:stageDepth={stagePlot.stage_depth}
							bind:unit
							bind:pdfPageFormat
							onPlaceRiser={placeRiser}
							onUpdateItem={updateItemProperty}
							{getItemZone}
							{getItemPosition}
							{updateItemPosition}
							{bandPersons}
							{plotPersonIds}
							onAddPersonToPlot={addPersonToPlot}
							onCreatePerson={createPerson}
							onRemovePersonFromPlot={removePersonFromPlot}
							{consoleType}
							{consoleDef}
							{consoleOptions}
							{categoryColorDefaults}
							{inputChannelMode}
							{outputChannelMode}
							channelOptions={consoleDef?.channelOptions ?? CHANNEL_OPTIONS}
							outputOptions={consoleDef?.outputOptions ?? CHANNEL_OPTIONS}
							onConsoleTypeChange={handleConsoleTypeChange}
							onCategoryColorDefaultsChange={handleCategoryColorDefaultsChange}
							onInputChannelModeChange={(m) => (inputChannelMode = m as ChannelMode)}
							onOutputChannelModeChange={(m) => (outputChannelMode = m as ChannelMode)}
						/>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Command Palette for Adding Items -->
<div data-command-palette>
	<ItemCommandPalette
		bind:open={isAddingItem}
		onselect={handleItemSelect}
		onclose={() => {
			isAddingItem = false;
			replacingItemId = null;
		}}
	/>
</div>

<style>
	.selectable-item:active {
		opacity: 0.8;
	}
	.selectable-item:hover {
		opacity: 0.95;
	}
</style>
