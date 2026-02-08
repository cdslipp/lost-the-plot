<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { toggleMode } from 'mode-watcher';
	import { MusicianCombobox, ItemCommandPalette, StagePatch, ImportExport } from '$lib';
	import Selecto from 'selecto';
	import Inspector from '$lib/components/Inspector.svelte';
	import { onClickOutside, PressedKeys } from 'runed';
	import StageDeck from '$lib/components/StageDeck.svelte';
	import { ContextMenu } from 'bits-ui';
	import { db } from '$lib/db';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import EditorToolbar from '$lib/components/EditorToolbar.svelte';
	import MusicianPanel from '$lib/components/MusicianPanel.svelte';
	import CanvasOverlay from '$lib/components/CanvasOverlay.svelte';
	import { exportToPdf } from '$lib/utils/pdf';
	import { feetToPixels, type UnitSystem } from '$lib/utils/scale';
	import { browser } from '$app/environment';

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

	// Reactive stage plot state — initialized in-memory, persisted to SQLite
	let stagePlot = $state({
		plot_name: 'Untitled Plot',
		revision_date: new Date().toISOString().split('T')[0],
		canvas: { width: 1100, height: 850 },
		items: [] as any[],
		musicians: [] as any[],
		stage_width: 24,
		stage_depth: 16
	});

	let layoutMode = $state<'mobile' | 'medium' | 'desktop'>('desktop');
	let sidePanelTab = $state<'inspector' | 'musicians'>('inspector');
	let mediumMainTab = $state<'canvas' | 'patch'>('canvas');
	let mobileMainTab = $state<'canvas' | 'patch' | 'panel'>('canvas');
	let mobilePanelTab = $state<'inspector' | 'musicians'>('inspector');

	// Persist reactive state to SQLite
	async function write() {
		if (!db.isReady) return;
		try {
			await db.run(
				`INSERT OR REPLACE INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					plotId,
					stagePlot.plot_name,
					stagePlot.revision_date,
					stagePlot.canvas.width,
					stagePlot.canvas.height,
					JSON.stringify({
					items: $state.snapshot(stagePlot.items),
					musicians: $state.snapshot(stagePlot.musicians),
					undoLog: $state.snapshot(history.log),
					redoStack: $state.snapshot(history.redoStack)
				}),
					bandId,
					stagePlot.stage_width,
					stagePlot.stage_depth
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
			}>('SELECT * FROM stage_plots WHERE id = ?', [plotId]);

			if (row) {
				stagePlot.plot_name = row.name;
				stagePlot.revision_date = row.revision_date;
				stagePlot.canvas.width = row.canvas_width;
				stagePlot.canvas.height = row.canvas_height;
				stagePlot.stage_width = row.stage_width ?? 24;
				stagePlot.stage_depth = row.stage_depth ?? 16;
				let savedUndoLog: { snapshot: any[]; timestamp: number }[] | undefined;
				let savedRedoStack: any[][] | undefined;
				if (row.metadata) {
					try {
						const meta = JSON.parse(row.metadata);
						if (meta.items) stagePlot.items = meta.items;
						if (meta.musicians) stagePlot.musicians = meta.musicians;
						if (meta.undoLog) savedUndoLog = meta.undoLog;
						if (meta.redoStack) savedRedoStack = meta.redoStack;
					} catch { /* ignore parse errors */ }
				}
				history.startRecording(savedUndoLog, savedRedoStack);
			} else {
				// Plot doesn't exist — redirect back to band
				goto(`/bands/${bandId}`, { replaceState: true });
			}

			// Load band name
			const bandRow = await db.queryOne<{ name: string }>('SELECT name FROM bands WHERE id = ?', [bandId]);
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
	const MAX_HISTORY = 50;

	class PlotHistory {
		log = $state<{ snapshot: any[]; timestamp: number }[]>([]);
		#redoStack = $state<any[][]>([]);
		#pointer = $state(-1);
		#recording = false;

		get redoStack() { return this.#redoStack; }
		get canUndo() { return this.#pointer > 0; }
		get canRedo() { return this.#redoStack.length > 0; }

		startRecording(savedLog?: { snapshot: any[]; timestamp: number }[], savedRedoStack?: any[][]) {
			if (savedLog?.length) {
				this.log = savedLog;
				this.#pointer = savedLog.length - 1;
			} else {
				// Seed with current state
				this.log = [{ snapshot: $state.snapshot(stagePlot.items) as any[], timestamp: Date.now() }];
				this.#pointer = 0;
			}
			this.#redoStack = savedRedoStack ?? [];
			this.#recording = true;
		}

		record(items: any[]) {
			if (!this.#recording) return;
			const snapshot = $state.snapshot(items) as any[];
			// Trim any forward entries if we recorded after undoing
			this.log = this.log.slice(0, this.#pointer + 1);
			this.log.push({ snapshot, timestamp: Date.now() });
			// Cap at MAX_HISTORY
			if (this.log.length > MAX_HISTORY) {
				this.log = this.log.slice(this.log.length - MAX_HISTORY);
			}
			this.#pointer = this.log.length - 1;
			this.#redoStack = [];
		}

		undo() {
			if (!this.canUndo) return;
			// Push current state onto redo stack
			this.#redoStack.push($state.snapshot(stagePlot.items) as any[]);
			this.#pointer--;
			const entry = this.log[this.#pointer];
			stagePlot.items.splice(0, stagePlot.items.length, ...structuredClone(entry.snapshot));
			debouncedWrite();
		}

		redo() {
			if (!this.canRedo) return;
			const snapshot = this.#redoStack.pop()!;
			this.#pointer++;
			// Update log pointer entry to match
			if (this.#pointer >= this.log.length) {
				this.log.push({ snapshot: $state.snapshot(snapshot) as any[], timestamp: Date.now() });
			}
			stagePlot.items.splice(0, stagePlot.items.length, ...structuredClone(snapshot));
			debouncedWrite();
		}
	}

	const history = new PlotHistory();

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
	let editingItem = $state<any>(null);
	let isAddingItem = $state(false);
	let showZones = $state(true);

	// Unit preference (persisted to localStorage)
	let unit = $state<UnitSystem>(
		(browser && localStorage.getItem('stageplotter-units') as UnitSystem) || 'imperial'
	);

	$effect(() => {
		if (browser) localStorage.setItem('stageplotter-units', unit);
	});

	// --- Stage Zones ---
	function getZones(cw: number, ch: number) {
		const colWidth = cw / 3;
		const rowHeight = ch / 2;
		return [
			{ key: 'DSR', x: 0, y: rowHeight, w: colWidth, h: rowHeight },
			{ key: 'DSC', x: colWidth, y: rowHeight, w: colWidth, h: rowHeight },
			{ key: 'DSL', x: colWidth * 2, y: rowHeight, w: colWidth, h: rowHeight },
			{ key: 'USR', x: 0, y: 0, w: colWidth, h: rowHeight },
			{ key: 'USC', x: colWidth, y: 0, w: colWidth, h: rowHeight },
			{ key: 'USL', x: colWidth * 2, y: 0, w: colWidth, h: rowHeight }
		];
	}

	function rectIntersectionArea(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
		const xOverlap = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
		const yOverlap = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
		return xOverlap * yOverlap;
	}

	function getItemZone(item: any) {
		const zones = getZones(canvasWidth, canvasHeight);
		let maxArea = 0;
		let chosen = zones[0].key;
		for (const z of zones) {
			const area = rectIntersectionArea(
				item.position.x, item.position.y, item.position.width, item.position.height,
				z.x, z.y, z.w, z.h
			);
			if (area > maxArea) { maxArea = area; chosen = z.key; }
		}
		return chosen;
	}

	function getItemPosition(item: any) {
		if (!canvasWidth || !canvasHeight) return { x: 0, y: 0 };
		const relativeX = item.position.x + item.position.width / 2 - canvasWidth / 2;
		const relativeY = canvasHeight - (item.position.y + item.position.height / 2);
		return { x: Math.round(relativeX), y: Math.round(relativeY) };
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
		if (prevStageWidth > 0 && prevStageDepth > 0 && (newW !== prevStageWidth || newD !== prevStageDepth)) {
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
	let newMusician = $state({ name: '', instrument: '' });
	let selecto: any;
	let justSelected = false;

	function clearSelections() {
		if (selecto && selectedItems.length > 0) {
			selectedItems.forEach((el: any) => {
				el.classList.remove('!ring-2', '!ring-blue-500');
			});
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

		selecto = new Selecto({
			container: canvasEl,
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
			e.added.forEach((el: any) => { el.classList.add('!ring-2', '!ring-blue-500'); });
			e.removed.forEach((el: any) => { el.classList.remove('!ring-2', '!ring-blue-500'); });
		});

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

	function openAddMenu() { isAddingItem = true; }

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
		isAddingItem = false;
		await preparePlacingItem(item);
	}

	function handleCanvasMouseMove(event: MouseEvent) {
		if (placingItem && canvasEl) {
			const rect = canvasEl.getBoundingClientRect();
			placingItem.x = event.clientX - rect.left - placingItem.width / 2;
			placingItem.y = event.clientY - rect.top - placingItem.height / 2;
		}
	}

	function handleCanvasClick(event: MouseEvent) {
		if (justSelected) { justSelected = false; return; }
		if (placingItem && canvasEl) {
			const rect = canvasEl.getBoundingClientRect();
			const x = event.clientX - rect.left - placingItem.width / 2;
			const y = event.clientY - rect.top - placingItem.height / 2;

			const newItem: any = {
				id: Date.now(),
				type: placingItem.type,
				itemData: placingItem.itemData,
				currentVariant: 'default',
				position: {
					width: placingItem.width,
					height: placingItem.height,
					x: Math.max(0, Math.min(x, canvasWidth - placingItem.width)),
					y: Math.max(0, Math.min(y, canvasHeight - placingItem.height))
				},
				name: placingItem.itemData?.name || '',
				channel: '',
				musician: ''
			};

			let ch = placingItem.channel;
			if (ch == null && placingItem.type === 'input') {
				ch = getNextAvailableChannel();
			}
			newItem.channel = ch != null ? String(ch) : '';
			stagePlot.items.push(newItem);

			const defaultInputs = placingItem.itemData?.default_inputs;
			if (defaultInputs && Array.isArray(defaultInputs)) {
				defaultInputs.forEach((inputDef: any, idx: number) => {
					stagePlot.items.push({
						id: Date.now() + idx + 1,
						type: 'input',
						itemData: { ...inputDef, item_type: 'input', name: inputDef.name, category: 'Input', path: '' },
						name: inputDef.name,
						channel: String(inputDef.ch || ''),
						musician: inputDef.source || '',
						currentVariant: 'default',
						position: { width: 0, height: 0, x: 0, y: 0 }
					});
				});
			}

			placingItem = null;
			commitChange();
		} else {
			const target = (event.target as HTMLElement);
			const clickedItem = target.closest('.selectable-item');
			if (!clickedItem) { clearSelections(); }
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
		el.classList.add('!ring-2', '!ring-blue-500');
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
		if ((event.metaKey || event.ctrlKey) && ((event.key === 'z' && event.shiftKey) || event.key === 'y')) {
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
			if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
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
			newItem.position.x = Math.min(sourceItem.position.x + 20, canvasWidth - sourceItem.position.width);
			newItem.position.y = Math.min(sourceItem.position.y + 20, canvasHeight - sourceItem.position.height);
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
		[stagePlot.items[idx], stagePlot.items[idx + 1]] = [stagePlot.items[idx + 1], stagePlot.items[idx]];
		commitChange();
	}

	function moveBackward(itemId: number) {
		const idx = stagePlot.items.findIndex((i: any) => i.id === itemId);
		if (idx <= 0) return;
		[stagePlot.items[idx - 1], stagePlot.items[idx]] = [stagePlot.items[idx], stagePlot.items[idx - 1]];
		commitChange();
	}

	function openItemEditor(item: any, event: any) {
		event.stopPropagation();
		const itemEl = document.querySelector(`[data-id="${item.id}"]`);
		if (itemEl) {
			if (selectedItems.length) {
				selectedItems.forEach((el: any) => el.classList.remove('!ring-2', '!ring-blue-500'));
			}
			selectedItems = [itemEl as HTMLElement];
			selecto?.setSelectedTargets([itemEl]);
			(itemEl as HTMLElement).classList.add('!ring-2', '!ring-blue-500');
			(itemEl as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
		}
	}

	function addMusician() {
		if (newMusician.name.trim() !== '') {
			stagePlot.musicians.push({
				id: Date.now(),
				name: newMusician.name.trim(),
				instrument: newMusician.instrument.trim()
			});
			newMusician.name = '';
			newMusician.instrument = '';
			debouncedWrite();
		}
	}

	function deleteMusician(id: number) {
		const index = stagePlot.musicians.findIndex((m: any) => m.id === id);
		if (index !== -1) {
			stagePlot.musicians.splice(index, 1);
			debouncedWrite();
		}
	}

	function handleDragStart(event: DragEvent, item: any) {
		if (placingItem) placingItem = null;
		event.dataTransfer!.setData('application/json', JSON.stringify({
			id: item.id,
			offsetX: (event as any).offsetX,
			offsetY: (event as any).offsetY
		}));
		event.dataTransfer!.effectAllowed = 'copyMove';
		(event.currentTarget as HTMLElement).style.opacity = '0.5';
	}

	function handleDragOver(event: DragEvent) { event.preventDefault(); }

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const data = JSON.parse(event.dataTransfer!.getData('application/json'));
		const item = stagePlot.items.find((i: any) => i.id === data.id);
		if (item && canvasEl) {
			const rect = canvasEl.getBoundingClientRect();
			const x = Math.max(0, Math.min(event.clientX - rect.left - data.offsetX, canvasWidth - item.position.width));
			const y = Math.max(0, Math.min(event.clientY - rect.top - data.offsetY, canvasHeight - item.position.height));

			if (isAltPressed) {
				duplicateItem(item, { position: { ...item.position, x, y } });
			} else {
				item.position.x = x;
				item.position.y = y;
				commitChange();
			}
		}
	}

	function handleDragEnd(event: DragEvent) {
		(event.currentTarget as HTMLElement).style.opacity = '1';
	}

	function getItemVariants(item: any) {
		if (!item.itemData) return null;
		if (item.itemData.variants) return item.itemData.variants;
		return null;
	}

	function getVariantKeys(item: any) {
		const variants = getItemVariants(item);
		if (!variants) return ['default'];
		return Object.keys(variants);
	}

	function rotateItemRight(item: any) {
		const variants = getItemVariants(item);
		if (!variants) return;
		const variantKeys = Object.keys(variants);
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

	function getCurrentImageSrc(item: any) {
		const variants = getItemVariants(item);
		if (!variants) return item.itemData?.image || '';
		const variant = item.currentVariant || 'default';
		const imagePath = variants[variant] || variants.default || Object.values(variants)[0];
		return buildImagePath(item, imagePath as string);
	}

	function buildImagePath(item: any, imagePath: string) {
		if (item.itemData?.path) {
			return `/final_assets/${item.itemData.path}/${imagePath}`;
		}
		return imagePath.startsWith('/') ? imagePath : '/' + imagePath;
	}

	function handlePatchItemUpdate(itemId: number, property: string, value: string) {
		const item = stagePlot.items.find((i: any) => i.id === itemId);
		if (item) { (item as any)[property] = value; commitChange(); }
	}

	function updateItemProperty(itemId: number, property: string, value: string) {
		const item = stagePlot.items.find((i: any) => i.id === itemId);
		if (!item) return;
		// Handle riser dimension properties stored in itemData
		if (['riserWidth', 'riserDepth', 'riserHeight'].includes(property)) {
			if (!item.itemData) item.itemData = {};
			item.itemData[property] = parseFloat(value);
			// Recalculate canvas pixel dimensions for width/depth
			if (property === 'riserWidth') {
				item.position.width = feetToPixels(parseFloat(value));
			} else if (property === 'riserDepth') {
				item.position.height = feetToPixels(parseFloat(value));
			}
		} else {
			(item as any)[property] = value;
		}
		commitChange();
	}

	function handlePatchReorder(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) return;
		if (fromIndex < 0 || toIndex < 0 || fromIndex >= stagePlot.items.length || toIndex >= stagePlot.items.length) return;
		const [moved] = stagePlot.items.splice(fromIndex, 1);
		stagePlot.items.splice(toIndex, 0, moved);
		commitChange();
	}

	function getNextAvailableChannel() {
		const used = new Set(stagePlot.items.filter((i: any) => i.channel).map((i: any) => parseInt(i.channel)));
		let ch = 1;
		while (used.has(ch)) ch++;
		return ch;
	}

	function handlePatchAddItem(item: any, channel: number) {
		stagePlot.items = stagePlot.items.filter((i: any) => i.channel !== String(channel));
		preparePlacingItem(item, channel);
	}

	function handlePatchRemoveItem(channel: number) {
		stagePlot.items = stagePlot.items.filter((i: any) => i.channel !== String(channel));
		commitChange();
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

	function importMusiciansFromBand(persons: { name: string; role: string | null }[]) {
		const baseId = Date.now();
		for (let i = 0; i < persons.length; i++) {
			stagePlot.musicians.push({
				id: baseId + i + 1,
				name: persons[i].name,
				instrument: persons[i].role || ''
			});
		}
		debouncedWrite();
	}

	async function handleExportPdf() {
		if (!canvasEl) return;
		await exportToPdf({
			plotName: stagePlot.plot_name,
			canvasEl,
			items: stagePlot.items,
			musicians: stagePlot.musicians
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

<div class="flex h-[calc(100dvh-3rem)] flex-col gap-3 overflow-hidden">
	<div class="shrink-0">
		<EditorToolbar
			bind:title={stagePlot.plot_name}
			revisionDate={stagePlot.revision_date}
			onAddItem={openAddMenu}
			onImportComplete={handleImportComplete}
			onExportPdf={handleExportPdf}
			backHref={'/bands/' + bandId}
			bind:items={stagePlot.items}
			bind:musicians={stagePlot.musicians}
			bind:canvasWidth
			bind:canvasHeight
			bind:lastModified={stagePlot.revision_date}
			{getItemZone}
			{getItemPosition}
			onTitleChange={() => debouncedWrite()}
			{bandName}
			persons={bandPersonsFull}
			stageWidth={stagePlot.stage_width}
			stageDepth={stagePlot.stage_depth}
		/>
	</div>

	{#if layoutMode === 'desktop'}
		<div class="flex flex-1 min-h-0 gap-5 overflow-hidden">
			<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" bind:this={stagePlotContainer}>
				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div class="border border-border-primary bg-surface p-2.5 shadow-sm">
						<div
							bind:this={canvasEl}
							class="items-container relative mx-auto w-full bg-white dark:bg-gray-800"
							style="aspect-ratio: {stagePlot.stage_width}/{stagePlot.stage_depth}; max-width: 1100px; cursor: {placingItem ? 'copy' : 'default'}"
							onmousemove={handleCanvasMouseMove}
							onclick={handleCanvasClick}
							ondragover={handleDragOver}
							ondrop={handleDrop}
						>
							<CanvasOverlay {showZones} {canvasWidth} {canvasHeight} itemCount={stagePlot.items.length} />

							{#each stagePlot.items as item (item.id)}
							<ContextMenu.Root>
								<ContextMenu.Trigger>
								<div
									class="group selectable-item absolute transition-all cursor-move {editingItem?.id === item.id ? 'ring-2 ring-blue-500' : ''}"
									class:selected={selectedItems.includes(item)}
									data-id={item.id}
									style="left: {item.position.x}px; top: {item.position.y}px; width: {item.position.width}px; height: {item.position.height}px;"
									draggable="true"
									ondragstart={(e) => handleDragStart(e, item)}
									ondragend={handleDragEnd}
									onclick={(e) => openItemEditor(item, e)}
								>
									{#if item.type === 'stageDeck'}
										<StageDeck size={item.size} x={0} y={0} class="w-full h-full" />
									{:else if item.type === 'riser'}
										<div class="flex h-full w-full items-center justify-center rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50">
											<div class="text-center leading-tight">
												<div class="text-[10px] font-bold text-gray-700 dark:text-gray-200">RISER</div>
												<div class="text-[8px] text-gray-600 dark:text-gray-300">{item.itemData?.riserWidth ?? '?'}' × {item.itemData?.riserDepth ?? '?'}'</div>
												{#if item.itemData?.riserHeight}
													<div class="text-[7px] text-gray-500 dark:text-gray-400">h: {item.itemData.riserHeight}'</div>
												{/if}
											</div>
										</div>
									{:else}
										<img src={getCurrentImageSrc(item)} alt={item.itemData?.name || item.name || 'Stage Item'} style="width: {item.position.width}px; height: {item.position.height}px;" />
									{/if}

									{#if selectedItems.some((el) => el.dataset?.id === String(item.id))}
										{#if getVariantKeys(item).length > 1}
											<div class="absolute -bottom-8 left-1/2 z-20 flex -translate-x-1/2 transform gap-1">
												<button
													onclick={(e) => { e.stopPropagation(); rotateItemRight(item); }}
													class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white shadow-md transition-colors hover:bg-blue-600"
													title="Rotate Right"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
													</svg>
												</button>
											</div>
										{/if}
									{/if}

									<button
										onclick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
										class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										&times;
									</button>
								</div>
							</ContextMenu.Trigger>
							<ContextMenu.Portal>
								<ContextMenu.Content class="z-50 w-[200px] rounded-xl border border-gray-300 bg-white px-1 py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800">
									<ContextMenu.Item onSelect={(e) => openItemEditor(item, e)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Edit
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => duplicateItem(item)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Duplicate
									</ContextMenu.Item>
									<ContextMenu.Separator class="bg-muted -mx-1 my-1 block h-px" />
									<ContextMenu.Item onSelect={() => moveToFront(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Bring to Front
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => moveForward(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Bring Forward
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => moveBackward(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Send Backward
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => moveToBack(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Send to Back
									</ContextMenu.Item>
									<ContextMenu.Separator class="bg-muted -mx-1 my-1 block h-px" />
									<ContextMenu.Item onSelect={() => deleteItem(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-600/30">
										Delete
									</ContextMenu.Item>
								</ContextMenu.Content>
							</ContextMenu.Portal>
							</ContextMenu.Root>
							{/each}

							{#if placingItem}
								<div
									class="pointer-events-none absolute opacity-60"
									style="left: {placingItem.x}px; top: {placingItem.y}px; width: {placingItem.width}px; height: {placingItem.height}px;"
								>
									{#if placingItem.type === 'riser'}
										<div class="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-gray-500 bg-gray-400/40 text-[10px] font-bold text-gray-700">
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
					</div>

					<div class="mt-1.5 flex justify-between text-xs text-text-tertiary">
						<div class="flex items-center gap-3">Items: {stagePlot.items.length} | Musicians: {stagePlot.musicians.length}
							{#if isAltPressed}
								<span class="text-blue-600 font-semibold animate-bounce">(Duplicate)</span>
							{/if}
						</div>
						<div>
							{#if placingItem}Click on canvas to place item. Press 'Escape' to cancel.{/if}
						</div>
					</div>
				</div>

				<div class="min-h-0 flex-1 overflow-hidden">
					<StagePatch
						items={stagePlot.items}
						columnCount={6}
						onUpdateItem={handlePatchItemUpdate}
						onReorderPatch={handlePatchReorder}
						onSelectItem={openItemEditor}
						onAddItem={handlePatchAddItem}
						onRemoveItem={handlePatchRemoveItem}
					/>
				</div>
			</div>

			<div class="flex w-80 shrink-0 flex-col overflow-hidden">
				<div class="inspector-panel flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm">
					<div class="border-b border-border-primary bg-muted/30 px-3 pt-3">
						<div class="flex gap-1">
							<button
								type="button"
								onclick={() => (sidePanelTab = 'inspector')}
								class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${sidePanelTab === 'inspector' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
							>
								Inspector
							</button>
							<button
								type="button"
								onclick={() => (sidePanelTab = 'musicians')}
								class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${sidePanelTab === 'musicians' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
							>
								Musicians
							</button>
						</div>
					</div>
					{#if sidePanelTab === 'inspector'}
						<div class="flex-1 min-h-0 overflow-hidden p-4">
							<Inspector
								bind:selectedItems
								bind:items={stagePlot.items}
								bind:musicians={stagePlot.musicians}
								bind:title={stagePlot.plot_name}
								bind:lastModified={stagePlot.revision_date}
								bind:showZones
								bind:stageWidth={stagePlot.stage_width}
								bind:stageDepth={stagePlot.stage_depth}
								bind:unit
								onPlaceRiser={placeRiser}
								onUpdateItem={updateItemProperty}
								onAddMusician={(name: string, instrument: string) => {
									newMusician.name = name;
									newMusician.instrument = instrument;
									addMusician();
								}}
								{getItemZone}
								{getItemPosition}
								{updateItemPosition}
							/>
						</div>
					{:else}
						<div class="flex-1 min-h-0 overflow-hidden p-4">
							<MusicianPanel
								musicians={stagePlot.musicians}
								onAdd={(name, instrument) => {
									newMusician.name = name;
									newMusician.instrument = instrument || '';
									addMusician();
								}}
								onDelete={deleteMusician}
								{bandPersons}
								onImportFromBand={importMusiciansFromBand}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else if layoutMode === 'medium'}
		<div class="flex flex-1 min-h-0 gap-5 overflow-hidden">
			<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" bind:this={stagePlotContainer}>
			<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-border-primary bg-surface shadow-sm overflow-hidden">
			<div class="border-b border-border-primary bg-muted/30 px-0 pt-0">
				<div class="flex w-full">
					<button
						type="button"
						onclick={() => (mediumMainTab = 'canvas')}
						class={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors border-b-2 ${mediumMainTab === 'canvas' ? 'bg-surface text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
					>
						Canvas
					</button>
					<button
						type="button"
						onclick={() => (mediumMainTab = 'patch')}
						class={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors border-b-2 ${mediumMainTab === 'patch' ? 'bg-surface text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
					>
						Patch List
					</button>
				</div>
			</div>
				{#if mediumMainTab === 'canvas'}
					<div class="flex-1 min-h-0 overflow-hidden p-4">
						<div class="border border-border-primary bg-surface p-3 shadow-sm">
							<div
								bind:this={canvasEl}
								class="items-container relative mx-auto w-full bg-white dark:bg-gray-800"
								style="aspect-ratio: {stagePlot.stage_width}/{stagePlot.stage_depth}; max-width: 1100px; cursor: {placingItem ? 'copy' : 'default'}"
								onmousemove={handleCanvasMouseMove}
								onclick={handleCanvasClick}
								ondragover={handleDragOver}
								ondrop={handleDrop}
							>
								<CanvasOverlay {showZones} {canvasWidth} {canvasHeight} itemCount={stagePlot.items.length} />

								{#each stagePlot.items as item (item.id)}
								<ContextMenu.Root>
									<ContextMenu.Trigger>
									<div
										class="group selectable-item absolute transition-all cursor-move {editingItem?.id === item.id ? 'ring-2 ring-blue-500' : ''}"
										class:selected={selectedItems.includes(item)}
										data-id={item.id}
										style="left: {item.position.x}px; top: {item.position.y}px; width: {item.position.width}px; height: {item.position.height}px;"
										draggable="true"
										ondragstart={(e) => handleDragStart(e, item)}
										ondragend={handleDragEnd}
										onclick={(e) => openItemEditor(item, e)}
									>
										{#if item.type === 'stageDeck'}
											<StageDeck size={item.size} x={0} y={0} class="w-full h-full" />
										{:else if item.type === 'riser'}
											<div class="flex h-full w-full items-center justify-center rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50">
												<div class="text-center leading-tight">
													<div class="text-[10px] font-bold text-gray-700 dark:text-gray-200">RISER</div>
													<div class="text-[8px] text-gray-600 dark:text-gray-300">{item.itemData?.riserWidth ?? '?'}' × {item.itemData?.riserDepth ?? '?'}'</div>
													{#if item.itemData?.riserHeight}
														<div class="text-[7px] text-gray-500 dark:text-gray-400">h: {item.itemData.riserHeight}'</div>
													{/if}
												</div>
											</div>
										{:else}
											<img src={getCurrentImageSrc(item)} alt={item.itemData?.name || item.name || 'Stage Item'} style="width: {item.position.width}px; height: {item.position.height}px;" />
										{/if}

										{#if selectedItems.some((el) => el.dataset?.id === String(item.id))}
											{#if getVariantKeys(item).length > 1}
												<div class="absolute -bottom-8 left-1/2 z-20 flex -translate-x-1/2 transform gap-1">
													<button
													onclick={(e) => { e.stopPropagation(); rotateItemRight(item); }}
													class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white shadow-md transition-colors hover:bg-blue-600"
													title="Rotate Right"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
														<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
													</svg>
												</button>
											</div>
										{/if}
									{/if}

									<button
										onclick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
										class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										&times;
									</button>
								</div>
							</ContextMenu.Trigger>
							<ContextMenu.Portal>
								<ContextMenu.Content class="z-50 w-[200px] rounded-xl border border-gray-300 bg-white px-1 py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800">
									<ContextMenu.Item onSelect={(e) => openItemEditor(item, e)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Edit
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => duplicateItem(item)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Duplicate
									</ContextMenu.Item>
									<ContextMenu.Separator class="bg-muted -mx-1 my-1 block h-px" />
									<ContextMenu.Item onSelect={() => moveToFront(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Bring to Front
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => moveForward(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Bring Forward
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => moveBackward(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Send Backward
									</ContextMenu.Item>
									<ContextMenu.Item onSelect={() => moveToBack(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
										Send to Back
									</ContextMenu.Item>
									<ContextMenu.Separator class="bg-muted -mx-1 my-1 block h-px" />
									<ContextMenu.Item onSelect={() => deleteItem(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-600/30">
										Delete
									</ContextMenu.Item>
								</ContextMenu.Content>
							</ContextMenu.Portal>
							</ContextMenu.Root>
							{/each}

							{#if placingItem}
								<div
									class="pointer-events-none absolute opacity-60"
									style="left: {placingItem.x}px; top: {placingItem.y}px; width: {placingItem.width}px; height: {placingItem.height}px;"
								>
									{#if placingItem.type === 'riser'}
										<div class="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-gray-500 bg-gray-400/40 text-[10px] font-bold text-gray-700">
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
					</div>

						<div class="mt-1.5 flex justify-between text-xs text-text-tertiary">
						<div class="flex items-center gap-3">Items: {stagePlot.items.length} | Musicians: {stagePlot.musicians.length}
							{#if isAltPressed}
								<span class="text-blue-600 font-semibold animate-bounce">(Duplicate)</span>
							{/if}
						</div>
						<div>
							{#if placingItem}Click on canvas to place item. Press 'Escape' to cancel.{/if}
						</div>
					</div>
				</div>
			{:else}
				<div class="flex-1 min-h-0 overflow-hidden p-4">
					<StagePatch
						items={stagePlot.items}
						columnCount={4}
						onUpdateItem={handlePatchItemUpdate}
						onReorderPatch={handlePatchReorder}
						onSelectItem={openItemEditor}
						onAddItem={handlePatchAddItem}
						onRemoveItem={handlePatchRemoveItem}
					/>
				</div>
			{/if}
		</div>
			</div>

			<div class="flex w-80 shrink-0 flex-col">
				<div class="inspector-panel flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm">
					<div class="border-b border-border-primary bg-muted/30 px-3 pt-3">
						<div class="flex gap-1">
							<button
								type="button"
								onclick={() => (sidePanelTab = 'inspector')}
								class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${sidePanelTab === 'inspector' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
							>
								Inspector
							</button>
							<button
								type="button"
								onclick={() => (sidePanelTab = 'musicians')}
								class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${sidePanelTab === 'musicians' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
							>
								Musicians
							</button>
						</div>
					</div>
					{#if sidePanelTab === 'inspector'}
						<div class="flex-1 min-h-0 overflow-hidden p-4">
							<Inspector
								bind:selectedItems
								bind:items={stagePlot.items}
								bind:musicians={stagePlot.musicians}
								bind:title={stagePlot.plot_name}
								bind:lastModified={stagePlot.revision_date}
								bind:showZones
								bind:stageWidth={stagePlot.stage_width}
								bind:stageDepth={stagePlot.stage_depth}
								bind:unit
								onPlaceRiser={placeRiser}
								onUpdateItem={updateItemProperty}
								onAddMusician={(name: string, instrument: string) => {
									newMusician.name = name;
									newMusician.instrument = instrument;
									addMusician();
								}}
								{getItemZone}
								{getItemPosition}
								{updateItemPosition}
							/>
						</div>
					{:else}
						<div class="flex-1 min-h-0 overflow-auto p-4">
							<MusicianPanel
								musicians={stagePlot.musicians}
								onAdd={(name, instrument) => {
									newMusician.name = name;
									newMusician.instrument = instrument || '';
									addMusician();
								}}
								onDelete={deleteMusician}
								{bandPersons}
								onImportFromBand={importMusiciansFromBand}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden">
		<div class="flex min-h-0 flex-1 flex-col rounded-xl border border-border-primary bg-surface shadow-sm overflow-hidden">
		<div class="border-b border-border-primary bg-muted/30 px-0 pt-0">
			<div class="flex w-full">
				<button
					type="button"
					onclick={() => (mobileMainTab = 'canvas')}
					class={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors border-b-2 ${mobileMainTab === 'canvas' ? 'bg-surface text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
				>
					Canvas
				</button>
				<button
					type="button"
					onclick={() => (mobileMainTab = 'patch')}
					class={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors border-b-2 ${mobileMainTab === 'patch' ? 'bg-surface text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
				>
					Patch List
				</button>
				<button
					type="button"
					onclick={() => (mobileMainTab = 'panel')}
					class={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors border-b-2 ${mobileMainTab === 'panel' ? 'bg-surface text-text-primary border-text-primary' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
				>
					Panel
				</button>
			</div>
		</div>
			{#if mobileMainTab === 'canvas'}
				<div class="flex-1 min-h-0 overflow-hidden p-4">
					<div class="border border-border-primary bg-surface p-2.5 shadow-sm">
						<div
							bind:this={canvasEl}
							class="items-container relative mx-auto w-full bg-white dark:bg-gray-800"
							style="aspect-ratio: {stagePlot.stage_width}/{stagePlot.stage_depth}; max-width: 1100px; cursor: {placingItem ? 'copy' : 'default'}"
							onmousemove={handleCanvasMouseMove}
							onclick={handleCanvasClick}
							ondragover={handleDragOver}
							ondrop={handleDrop}
						>
							<CanvasOverlay {showZones} {canvasWidth} {canvasHeight} itemCount={stagePlot.items.length} />

							{#each stagePlot.items as item (item.id)}
							<ContextMenu.Root>
								<ContextMenu.Trigger>
								<div
									class="group selectable-item absolute transition-all cursor-move {editingItem?.id === item.id ? 'ring-2 ring-blue-500' : ''}"
									class:selected={selectedItems.includes(item)}
									data-id={item.id}
									style="left: {item.position.x}px; top: {item.position.y}px; width: {item.position.width}px; height: {item.position.height}px;"
									draggable="true"
									ondragstart={(e) => handleDragStart(e, item)}
									ondragend={handleDragEnd}
									onclick={(e) => openItemEditor(item, e)}
								>
									{#if item.type === 'stageDeck'}
										<StageDeck size={item.size} x={0} y={0} class="w-full h-full" />
									{:else if item.type === 'riser'}
										<div class="flex h-full w-full items-center justify-center rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50">
											<div class="text-center leading-tight">
												<div class="text-[10px] font-bold text-gray-700 dark:text-gray-200">RISER</div>
												<div class="text-[8px] text-gray-600 dark:text-gray-300">{item.itemData?.riserWidth ?? '?'}' × {item.itemData?.riserDepth ?? '?'}'</div>
												{#if item.itemData?.riserHeight}
													<div class="text-[7px] text-gray-500 dark:text-gray-400">h: {item.itemData.riserHeight}'</div>
												{/if}
											</div>
										</div>
									{:else}
										<img src={getCurrentImageSrc(item)} alt={item.itemData?.name || item.name || 'Stage Item'} style="width: {item.position.width}px; height: {item.position.height}px;" />
									{/if}

									{#if selectedItems.some((el) => el.dataset?.id === String(item.id))}
										{#if getVariantKeys(item).length > 1}
											<div class="absolute -bottom-8 left-1/2 z-20 flex -translate-x-1/2 transform gap-1">
												<button
												onclick={(e) => { e.stopPropagation(); rotateItemRight(item); }}
												class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white shadow-md transition-colors hover:bg-blue-600"
												title="Rotate Right"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
												</svg>
											</button>
										</div>
									{/if}
								{/if}

								<button
									onclick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
									class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
								>
									&times;
								</button>
							</div>
						</ContextMenu.Trigger>
						<ContextMenu.Portal>
							<ContextMenu.Content class="z-50 w-[200px] rounded-xl border border-gray-300 bg-white px-1 py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800">
								<ContextMenu.Item onSelect={(e) => openItemEditor(item, e)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
									Edit
								</ContextMenu.Item>
								<ContextMenu.Item onSelect={() => duplicateItem(item)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
									Duplicate
								</ContextMenu.Item>
								<ContextMenu.Separator class="bg-muted -mx-1 my-1 block h-px" />
								<ContextMenu.Item onSelect={() => moveToFront(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
									Bring to Front
								</ContextMenu.Item>
								<ContextMenu.Item onSelect={() => moveForward(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
									Bring Forward
								</ContextMenu.Item>
								<ContextMenu.Item onSelect={() => moveBackward(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
									Send Backward
								</ContextMenu.Item>
								<ContextMenu.Item onSelect={() => moveToBack(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
									Send to Back
								</ContextMenu.Item>
								<ContextMenu.Separator class="bg-muted -mx-1 my-1 block h-px" />
								<ContextMenu.Item onSelect={() => deleteItem(item.id)} class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-600/30">
									Delete
								</ContextMenu.Item>
							</ContextMenu.Content>
						</ContextMenu.Portal>
						</ContextMenu.Root>
						{/each}

						{#if placingItem}
							<div
								class="pointer-events-none absolute opacity-60"
								style="left: {placingItem.x}px; top: {placingItem.y}px; width: {placingItem.width}px; height: {placingItem.height}px;"
							>
								{#if placingItem.type === 'riser'}
									<div class="flex h-full w-full items-center justify-center rounded border-2 border-dashed border-gray-500 bg-gray-400/40 text-[10px] font-bold text-gray-700">
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
				</div>

					<div class="mt-1.5 flex justify-between text-xs text-text-tertiary">
					<div class="flex items-center gap-3">Items: {stagePlot.items.length} | Musicians: {stagePlot.musicians.length}
						{#if isAltPressed}
							<span class="text-blue-600 font-semibold animate-bounce">(Duplicate)</span>
						{/if}
					</div>
					<div>
						{#if placingItem}Click on canvas to place item. Press 'Escape' to cancel.{/if}
					</div>
				</div>
			</div>
			{:else if mobileMainTab === 'patch'}
				<div class="flex-1 min-h-0 overflow-hidden p-4">
					<StagePatch
						items={stagePlot.items}
						columnCount={4}
						onUpdateItem={handlePatchItemUpdate}
						onReorderPatch={handlePatchReorder}
						onSelectItem={openItemEditor}
						onAddItem={handlePatchAddItem}
						onRemoveItem={handlePatchRemoveItem}
					/>
				</div>
			{:else}
				<div class="flex-1 min-h-0 overflow-hidden p-4">
					<div class="inspector-panel flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm">
						<div class="border-b border-border-primary bg-muted/30 px-3 pt-3">
							<div class="flex gap-1">
								<button
									type="button"
									onclick={() => (mobilePanelTab = 'inspector')}
									class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${mobilePanelTab === 'inspector' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
								>
									Inspector
								</button>
								<button
									type="button"
									onclick={() => (mobilePanelTab = 'musicians')}
									class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${mobilePanelTab === 'musicians' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
								>
									Musicians
								</button>
							</div>
						</div>
						{#if mobilePanelTab === 'inspector'}
							<div class="flex-1 min-h-0 overflow-auto p-4">
								<Inspector
									bind:selectedItems
									bind:items={stagePlot.items}
									bind:musicians={stagePlot.musicians}
									bind:title={stagePlot.plot_name}
									bind:lastModified={stagePlot.revision_date}
									bind:showZones
									bind:stageWidth={stagePlot.stage_width}
									bind:stageDepth={stagePlot.stage_depth}
									bind:unit
									onPlaceRiser={placeRiser}
									onUpdateItem={updateItemProperty}
									onAddMusician={(name: string, instrument: string) => {
										newMusician.name = name;
										newMusician.instrument = instrument;
										addMusician();
									}}
									{getItemZone}
									{getItemPosition}
									{updateItemPosition}
								/>
							</div>
						{:else}
							<div class="flex-1 min-h-0 overflow-auto p-4">
								<MusicianPanel
									musicians={stagePlot.musicians}
									onAdd={(name, instrument) => {
										newMusician.name = name;
										newMusician.instrument = instrument || '';
										addMusician();
									}}
									onDelete={deleteMusician}
									{bandPersons}
									onImportFromBand={importMusiciansFromBand}
								/>
							</div>
						{/if}
					</div>
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
		onclose={() => (isAddingItem = false)}
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
