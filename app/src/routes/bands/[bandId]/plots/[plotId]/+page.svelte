<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { ItemCommandPalette, StagePatch } from '$lib';
	import type { ProcessedItem } from '$lib/utils/finalAssetsLoader';
	import Selecto from 'selecto';
	import { PressedKeys } from 'runed';
	import StageDeck from '$lib/components/StageDeck.svelte';
	import { ContextMenu } from 'bits-ui';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import EditorToolbar from '$lib/components/EditorToolbar.svelte';
	import EditorSidePanel from '$lib/components/EditorSidePanel.svelte';
	import CanvasOverlay from '$lib/components/CanvasOverlay.svelte';
	import { exportToPdf } from '$lib/utils/pdf';
	import { imagePxToFeet } from '$lib/utils/scale';
	import { browser } from '$app/environment';
	import { getVariantKeys, getCurrentImageSrc } from '$lib/utils/canvasUtils';
	import { StagePlotState, setPlotState } from '$lib/state/stagePlotState.svelte';
	import { APP_NAME } from '$lib/config';

	// --- Route params ---
	let plotId = $derived($page.params.plotId);
	let bandId = $derived($page.params.bandId);

	// --- State class (source of truth) ---
	const ps = new StagePlotState($page.params.plotId!, $page.params.bandId!);
	setPlotState(ps);

	// --- New plot flag (auto-focus name) ---
	let isNewPlot = $state($page.url.searchParams.has('new'));

	// --- UI-only layout state ---
	let layoutMode = $state<'mobile' | 'medium' | 'desktop'>('desktop');
	let viewOnly = $derived(layoutMode === 'mobile');
	let sidePanelTab = $state<'inspector' | 'people' | 'settings'>('inspector');
	let mediumMainTab = $state<'canvas' | 'patch'>('canvas');
	let mobileMainTab = $state<'canvas' | 'patch' | 'panel'>('canvas');
	let mobilePanelTab = $state<'inspector' | 'people' | 'settings'>('inspector');

	// --- Canvas DOM refs & contain-fit sizing ---
	let canvasEl = $state<HTMLElement | null>(null);
	let canvasWrapperEl = $state<HTMLElement | undefined>();
	let canvasPixelWidth = $state(800);
	let canvasPixelHeight = $state(533);
	let pxPerFoot = $derived(canvasPixelWidth / ps.stageWidth);
	let canvasResizeObserver: ResizeObserver | null = null;
	// --- Selection & interaction state (ID-based) ---
	let selectedItemIds = $state<number[]>([]);
	let selectedChannelNum = $state<number | null>(null);
	const selectedIdSet = $derived(new Set(selectedItemIds));
	let isAddingItem = $state(false);
	let replacingItemId = $state<number | null>(null);

	// --- Scroll to patched channel when selected on stage ---
	$effect(() => {
		if (selectedItemIds.length === 1 && !selectedChannelNum) {
			const itemId = selectedItemIds[0];
			const channelNum = ps.channelByItemId.get(itemId);
			if (channelNum) {
				const el = document.getElementById(`channel-row-${channelNum}`);
				if (el) {
					el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				}
			}
		}
	});

	let placingItem = $state<any>(null);
	let pendingChannelLink = $state<number | null>(null);
	let selecto: any;
	// Plain `let` (not $state) — used as a synchronous flag to prevent click-after-select races
	let justSelected = false;

	// --- Pointer drag state ---
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

	// --- Rotation drag state ---
	let rotating = $state<{
		item: any;
		startAngle: number;
		startRotation: number;
	} | null>(null);

	/** Convert screen coordinates to stage coordinates (feet) */
	function toStageCoords(clientX: number, clientY: number) {
		const rect = canvasEl!.getBoundingClientRect();
		return {
			x: ((clientX - rect.left) / rect.width) * ps.stageWidth,
			y: ((clientY - rect.top) / rect.height) * ps.stageDepth
		};
	}

	function handleRotationStart(event: PointerEvent, item: any) {
		event.stopPropagation();
		event.preventDefault();
		const el = event.currentTarget as HTMLElement;
		el.setPointerCapture(event.pointerId);

		const centerX = item.position.x + item.position.width / 2;
		const centerY = item.position.y + item.position.height / 2;
		const mouse = toStageCoords(event.clientX, event.clientY);
		const startAngle = Math.atan2(mouse.y - centerY, mouse.x - centerX) * (180 / Math.PI);

		rotating = {
			item,
			startAngle,
			startRotation: item.position.rotation ?? 0
		};
	}

	function handleRotationMove(event: PointerEvent) {
		if (!rotating || !canvasEl) return;
		const centerX = rotating.item.position.x + rotating.item.position.width / 2;
		const centerY = rotating.item.position.y + rotating.item.position.height / 2;
		const mouse = toStageCoords(event.clientX, event.clientY);
		const currentAngle = Math.atan2(mouse.y - centerY, mouse.x - centerX) * (180 / Math.PI);
		let delta = currentAngle - rotating.startAngle;
		let newRotation = rotating.startRotation + delta;

		// Shift key: snap to 15-degree increments
		if (event.shiftKey) {
			newRotation = Math.round(newRotation / 15) * 15;
		}

		rotating.item.position.rotation = newRotation;
	}

	function handleRotationEnd() {
		if (!rotating) return;
		ps.commitChange();
		rotating = null;
	}

	// --- Keyboard ---
	const keys = new PressedKeys();
	const isAltPressed = $derived(keys.has('Alt'));

	function nudgeSelected(dx: number, dy: number) {
		if (!selectedItemIds.length) return;
		// Use the already-derived selectedIdSet for O(1) lookups instead of
		// doing items.find() per selected ID (which is O(selected * items))
		for (const item of ps.items) {
			if (!selectedIdSet.has(item.id)) continue;
			item.position.x = Math.max(
				0,
				Math.min(ps.stageWidth - item.position.width, item.position.x + dx)
			);
			item.position.y = Math.max(
				0,
				Math.min(ps.stageDepth - item.position.height, item.position.y + dy)
			);
		}
		ps.commitChange();
	}

	function deleteSelected() {
		if (!selectedItemIds.length) return;
		const ids = new Set(selectedItemIds.map((id) => String(id)));
		ps.deleteItems(ids);
		clearSelections();
	}

	function handleDeleteHotkey() {
		const active = document.activeElement as HTMLElement | null;
		if (active) {
			const tag = active.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
		}
		deleteSelected();
	}

	keys.onKeys(['ArrowUp'], () => !viewOnly && nudgeSelected(0, -0.25));
	keys.onKeys(['ArrowDown'], () => !viewOnly && nudgeSelected(0, 0.25));
	keys.onKeys(['ArrowLeft'], () => !viewOnly && nudgeSelected(-0.25, 0));
	keys.onKeys(['ArrowRight'], () => !viewOnly && nudgeSelected(0.25, 0));
	keys.onKeys(['Delete'], () => !viewOnly && handleDeleteHotkey());
	keys.onKeys(['Backspace'], () => !viewOnly && handleDeleteHotkey());

	// --- Selection helpers ---
	function clearItemSelection() {
		if (selectedItemIds.length > 0) {
			selectedItemIds = [];
			selecto?.setSelectedTargets([]);
		}
	}

	function clearChannelSelection() {
		selectedChannelNum = null;
	}

	function clearSelections() {
		clearItemSelection();
		clearChannelSelection();
	}

	/** Set selection to the given IDs and sync Selecto's DOM state */
	function selectItems(ids: number[]) {
		clearChannelSelection();
		selectedItemIds = ids;
		if (selecto && canvasEl) {
			const els = ids
				.map((id) => canvasEl!.querySelector(`[data-id="${id}"]`) as HTMLElement | null)
				.filter(Boolean) as HTMLElement[];
			selecto.setSelectedTargets(els);
		}
	}

	function selectChannel(chNum: number) {
		clearItemSelection();
		selectedChannelNum = chNum;
		sidePanelTab = 'inspector';
	}

	/** Toggle item selection with shift/ctrl support */
	function toggleItemSelection(id: number, event?: MouseEvent) {
		if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
			// Add/remove from selection
			if (selectedIdSet.has(id)) {
				selectItems(selectedItemIds.filter((i) => i !== id));
			} else {
				selectItems([...selectedItemIds, id]);
			}
		} else {
			// Replace selection
			selectItems([id]);
		}
	}

	function selectItemByIndex(index: number) {
		if (ps.items.length === 0) return;
		const item = ps.items[index];
		if (!item) return;
		selectItems([item.id]);
		const el = canvasEl?.querySelector(`[data-id="${item.id}"]`) as HTMLElement | null;
		el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	// --- Navigation guards ---
	beforeNavigate(async () => {
		await ps.flushWrite();
	});

	function handleBeforeUnload() {
		ps.flushWrite();
	}

	// --- Mount ---
	onMount(() => {
		ps.load().then((found) => {
			if (!found) goto(`/bands/${bandId}`, { replaceState: true });
		});

		// Clean up ?new query param without triggering a SvelteKit navigation
		if (isNewPlot) {
			history.replaceState(history.state, '', `/bands/${bandId}/plots/${plotId}`);
		}

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	// --- Click-outside canvas deselection ---
	$effect(() => {
		if (!browser) return;
		const el = canvasEl;
		if (!el) return;

		function handlePointerDown(event: PointerEvent) {
			if (el!.contains(event.target as Node)) return;
			const target = event.target as HTMLElement;
			if (
				target.closest('.inspector-panel') ||
				target.closest('[data-command-palette]') ||
				target.closest('[data-patch-list]')
			)
				return;
			clearSelections();
		}

		document.addEventListener('pointerdown', handlePointerDown, true);
		return () => document.removeEventListener('pointerdown', handlePointerDown, true);
	});

	// --- Selecto lifecycle ---
	$effect(() => {
		const el = canvasEl;
		if (!el || viewOnly) {
			selecto?.destroy();
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
			selectedItemIds = e.selected
				.map((el: HTMLElement) => parseInt(el.dataset?.id || '0'))
				.filter((id: number) => id > 0);
			if (e.selected.length) justSelected = true;
		});

		return () => {
			selecto?.destroy();
			selecto = null;
			selectedItemIds = [];
			dragging = null;
		};
	});

	// --- Canvas resize observer (contain-fit: fill available space while preserving stage aspect ratio) ---
	function computeCanvasSize(availW: number, availH: number) {
		if (!availW || !availH) return;
		const stageAspect = ps.stageWidth / ps.stageDepth;
		if (availW / availH > stageAspect) {
			// Height-constrained (wide viewport relative to stage)
			canvasPixelHeight = availH;
			canvasPixelWidth = Math.round(availH * stageAspect);
		} else {
			// Width-constrained (normal case)
			canvasPixelWidth = availW;
			canvasPixelHeight = Math.round(availW / stageAspect);
		}
	}

	$effect(() => {
		if (!browser || !canvasWrapperEl) return;
		// Subscribe to stageWidth/stageDepth so we recompute when they change
		void ps.stageWidth;
		void ps.stageDepth;

		canvasResizeObserver?.disconnect();
		canvasResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				computeCanvasSize(entry.contentRect.width, entry.contentRect.height);
			}
		});
		canvasResizeObserver.observe(canvasWrapperEl);
		// Set initial size
		const rect = canvasWrapperEl.getBoundingClientRect();
		computeCanvasSize(rect.width, rect.height);

		return () => {
			canvasResizeObserver?.disconnect();
		};
	});

	// --- Responsive layout ---
	onMount(() => {
		if (!browser) return;
		const mobileQuery = window.matchMedia('(max-width: 767px)');
		const mediumQuery = window.matchMedia('(min-width: 768px) and (max-width: 1499px)');
		const desktopQuery = window.matchMedia('(min-width: 1500px)');

		const updateLayout = () => {
			if (desktopQuery.matches) layoutMode = 'desktop';
			else if (mediumQuery.matches) layoutMode = 'medium';
			else layoutMode = 'mobile';
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

	// --- Command palette / item placement ---
	function openAddMenu() {
		mediumMainTab = 'canvas';
		mobileMainTab = 'canvas';
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
			width: imagePxToFeet(img.naturalWidth || 80),
			height: imagePxToFeet(img.naturalHeight || 60),
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
		const ch = pendingChannelLink;
		pendingChannelLink = null;
		await preparePlacingItem(item, ch);
	}

	function placeItemForChannel(channelNum: number) {
		pendingChannelLink = channelNum;
		openAddMenu();
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

		const idx = ps.items.findIndex((i: any) => i.id === targetId);
		if (idx === -1) return;

		const existing = ps.items[idx];
		const img = new Image();
		img.src = newItemData.image;
		await new Promise((resolve) => {
			img.onload = resolve;
			img.onerror = () => resolve(undefined);
		});
		const newWidth = imagePxToFeet(img.naturalWidth || 80);
		const newHeight = imagePxToFeet(img.naturalHeight || 60);

		ps.items[idx] = {
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
		ps.commitChange();
	}

	// --- Canvas mouse/click handlers ---
	function handleCanvasMouseMove(event: MouseEvent) {
		if (placingItem && canvasEl) {
			const coords = toStageCoords(event.clientX, event.clientY);
			let x = coords.x - placingItem.width / 2;
			let y = coords.y - placingItem.height / 2;
			const snapped = ps.snapToGrid(x, y, placingItem.width, placingItem.height);
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
			const coords = toStageCoords(event.clientX, event.clientY);
			const rawX = coords.x - placingItem.width / 2;
			const rawY = coords.y - placingItem.height / 2;
			const snapped = ps.snapToGrid(rawX, rawY, placingItem.width, placingItem.height);

			const newItem: any = {
				id: Date.now(),
				type: placingItem.type,
				itemData: placingItem.itemData,
				currentVariant: 'default',
				position: {
					width: placingItem.width,
					height: placingItem.height,
					x: Math.max(0, Math.min(snapped.x, ps.stageWidth - placingItem.width)),
					y: Math.max(0, Math.min(snapped.y, ps.stageDepth - placingItem.height))
				},
				name: placingItem.itemData?.name || '',
				person_id: placingItem.person_id ?? null
			};

			ps.items.push(newItem);

			// Assign to channel only if explicitly set
			const ch = placingItem.channel;
			if (ch != null) {
				ps.assignItemToChannel(newItem.id, ch);
			}

			const isMonitor = ps.isMonitorItem(placingItem.itemData);
			const defaultInputs = isMonitor ? null : placingItem.itemData?.default_inputs;
			if (defaultInputs && Array.isArray(defaultInputs)) {
				defaultInputs.forEach((inputDef: any, idx: number) => {
					const defItem: any = {
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
						person_id: null,
						currentVariant: 'default',
						position: { width: 0, height: 0, x: 0, y: 0 }
					};
					ps.items.push(defItem);
					if (inputDef.ch) {
						ps.assignItemToChannel(defItem.id, inputDef.ch);
					}
				});
			}

			ps.addDefaultOutputs(placingItem.itemData, newItem.id);
			ps.autoNumberItems();
			placingItem = null;
			ps.commitChange();
		} else {
			const target = event.target as HTMLElement;
			const clickedItem = target.closest('.selectable-item');
			if (!clickedItem) {
				clearSelections();
			}
		}
	}

	function openItemEditor(item: any, event: any) {
		if (justSelected) {
			justSelected = false;
			return;
		}
		event.stopPropagation();
		selectItems([item.id]);
		const itemEl = canvasEl?.querySelector(`[data-id="${item.id}"]`) as HTMLElement | null;
		itemEl?.scrollIntoView({
			block: 'nearest',
			inline: 'nearest',
			behavior: 'smooth'
		});
	}

	// --- People (thin wrappers that integrate with placingItem) ---
	async function addPersonToPlot(personId: number, silhouetteItem: ProcessedItem) {
		await ps.addPersonToPlot(personId, silhouetteItem);
		await preparePlacingItem(silhouetteItem);
		if (placingItem) {
			placingItem.person_id = personId;
		}
	}

	// --- Drag handlers ---
	function handleItemPointerDown(event: PointerEvent, item: any) {
		if (event.button !== 0) return;
		if (placingItem) return;
		if ((event.target as HTMLElement).closest('button')) return;

		const el = event.currentTarget as HTMLElement;
		el.setPointerCapture(event.pointerId);

		const coords = toStageCoords(event.clientX, event.clientY);

		const isInSelection = selectedIdSet.has(item.id);
		let group: Array<{ item: any; startX: number; startY: number }>;
		if (isInSelection && selectedItemIds.length > 1) {
			// Single pass through items using the derived Set for O(1) membership checks
			group = ps.items
				.filter((i: any) => selectedIdSet.has(i.id))
				.map((i: any) => ({ item: i, startX: i.position.x, startY: i.position.y }));
		} else {
			group = [{ item, startX: item.position.x, startY: item.position.y }];
		}

		dragging = {
			item,
			offsetX: coords.x - item.position.x,
			offsetY: coords.y - item.position.y,
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

		const coords = toStageCoords(event.clientX, event.clientY);
		const rawX = coords.x - dragging.offsetX;
		const rawY = coords.y - dragging.offsetY;

		if (!dragging.moved) {
			const dx = rawX - dragging.startX;
			const dy = rawY - dragging.startY;
			if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
			dragging.moved = true;
		}

		const deltaX = rawX - dragging.startX;
		const deltaY = rawY - dragging.startY;

		if (isAltPressed) {
			dragging.item.position.x = dragging.startX;
			dragging.item.position.y = dragging.startY;
			const clampedX = Math.max(0, Math.min(rawX, ps.stageWidth - dragging.item.position.width));
			const clampedY = Math.max(0, Math.min(rawY, ps.stageDepth - dragging.item.position.height));
			dragging.ghostX = clampedX;
			dragging.ghostY = clampedY;
		} else {
			for (const entry of dragging.group) {
				const newX = entry.startX + deltaX;
				const newY = entry.startY + deltaY;
				entry.item.position.x = Math.max(
					0,
					Math.min(newX, ps.stageWidth - entry.item.position.width)
				);
				entry.item.position.y = Math.max(
					0,
					Math.min(newY, ps.stageDepth - entry.item.position.height)
				);
			}
		}
	}

	function handleItemPointerUp(event: PointerEvent) {
		if (!dragging) return;

		if (dragging.moved) {
			if (isAltPressed) {
				const snapped = ps.snapToGrid(
					dragging.ghostX,
					dragging.ghostY,
					dragging.item.position.width,
					dragging.item.position.height
				);
				const x = Math.max(0, Math.min(snapped.x, ps.stageWidth - dragging.item.position.width));
				const y = Math.max(0, Math.min(snapped.y, ps.stageDepth - dragging.item.position.height));
				ps.duplicateItem(dragging.item, { position: { ...dragging.item.position, x, y } });
			} else {
				for (const entry of dragging.group) {
					const snapped = ps.snapToGrid(
						entry.item.position.x,
						entry.item.position.y,
						entry.item.position.width,
						entry.item.position.height
					);
					const x = Math.max(0, Math.min(snapped.x, ps.stageWidth - entry.item.position.width));
					const y = Math.max(0, Math.min(snapped.y, ps.stageDepth - entry.item.position.height));
					entry.item.position.x = x;
					entry.item.position.y = y;
				}
				ps.commitChange();
			}
			justSelected = true;
		}

		dragging = null;
	}

	// --- Riser placement (dimensions in feet) ---
	function placeRiser(riserWidth: number, riserDepth: number, riserHeight: number) {
		placingItem = {
			type: 'riser',
			itemData: {
				name: `Riser ${riserWidth}'×${riserDepth}'`,
				item_type: 'riser',
				riserWidth,
				riserDepth,
				riserHeight
			},
			width: riserWidth,
			height: riserDepth,
			x: -1000,
			y: -1000
		};
	}

	// --- PDF export ---
	async function handleExportPdf() {
		if (!canvasEl) return;
		// Build items list from inputChannels with assigned items
		const pdfItems = ps.inputChannels
			.filter((ch) => ch.itemId != null)
			.map((ch) => {
				const item = ps.itemByChannel.get(ch.channelNum);
				return {
					name: item?.name ?? '',
					channel: String(ch.channelNum),
					person_name: item?.person_id ? ps.personsById[item.person_id]?.name || '' : ''
				};
			});
		await exportToPdf({
			plotName: ps.plotName,
			canvasEl,
			items: pdfItems,
			persons: ps.plotPersons.map((p) => ({ name: p.name, role: p.role || '' })),
			pageFormat: ps.pdfPageFormat
		});
	}

	function handleImportComplete() {
		clearSelections();
		placingItem = null;
		ps.commitChange();
	}

	// --- Global keyboard handler ---
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (!viewOnly) {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				openAddMenu();
			}
			if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
				event.preventDefault();
				ps.history.undo();
				return;
			}
			if (
				(event.metaKey || event.ctrlKey) &&
				((event.key === 'z' && event.shiftKey) || event.key === 'y')
			) {
				event.preventDefault();
				ps.history.redo();
				return;
			}
		}
		if (event.key === 'Escape') {
			placingItem = null;
			clearSelections();
		}
		if (event.key === 'Tab') {
			if (isAddingItem) return;
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
				mobileMainTab = mobileMainTab === 'canvas' ? 'patch' : 'canvas';
				return;
			}
		}
	}
</script>

<svelte:head>
	<title>{ps.plotName || 'Plot'} | {APP_NAME}</title>
</svelte:head>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="flex h-[calc(100dvh-4.25rem)] flex-col gap-3 overflow-hidden">
	<div class="shrink-0">
		<EditorToolbar
			onAddItem={openAddMenu}
			onImportComplete={handleImportComplete}
			onExportPdf={handleExportPdf}
			backHref={'/bands/' + bandId}
			{viewOnly}
			autoFocusName={isNewPlot}
		/>
	</div>

	{#snippet patchContent(columnCount: number)}
		<StagePatch
			inputChannels={ps.inputChannels}
			outputChannels={ps.outputChannels}
			itemByChannel={ps.itemByChannel}
			outputByChannel={ps.outputByChannel}
			{selectedItemIds}
			{selectedChannelNum}
			onSelectionChange={(ids, event) => {
				if (ids.length) {
					toggleItemSelection(ids[0], event);
					sidePanelTab = 'inspector';
				} else {
					clearSelections();
				}
			}}
			onChannelSelect={(chNum, event) => selectChannel(chNum)}
			onChannelNameInput={(chNum, name) => ps.setChannelName(chNum, name)}
			onChannelNameCommit={() => ps.commitChange()}
			{columnCount}
			readonly={viewOnly}
			onRemoveItem={(ch) => ps.removePatchItem(ch)}
			onClearPatch={() => ps.clearAllPatch()}
			onOutputRemove={(ch) => ps.removeOutput(ch)}
			consoleType={ps.consoleType}
			stereoLinks={ps.stereoLinks}
			onStereoLinksChange={(links) => ps.setStereoLinks(links)}
			outputStereoLinks={ps.outputStereoLinks}
			onOutputStereoLinksChange={(links) => ps.setOutputStereoLinks(links)}
		/>
	{/snippet}

	{#snippet canvasContent()}
		<div bind:this={canvasWrapperEl} class="flex min-h-0 flex-1 items-center justify-center">
			<div>
				{#if viewOnly}
					<!-- View-only canvas: no context menus, no interactions -->
					<div
						bind:this={canvasEl}
						class="items-container relative overflow-hidden bg-white dark:bg-gray-800"
						style="width: {canvasPixelWidth}px; height: {canvasPixelHeight}px;"
					>
						<CanvasOverlay
							showZones={ps.showZones}
							stageWidth={ps.stageWidth}
							stageDepth={ps.stageDepth}
							{pxPerFoot}
							itemCount={ps.items.length}
						/>

						{#each ps.items as item (item.id)}
							<div
								class="absolute select-none"
								data-id={item.id}
								style="left: {item.position.x * pxPerFoot}px; top: {item.position.y *
									pxPerFoot}px; width: {item.position.width * pxPerFoot}px; height: {item.position
									.height * pxPerFoot}px; transform: rotate({item.position.rotation ??
									0}deg); transform-origin: center;"
							>
								{#if item.type === 'stageDeck'}
									<StageDeck size={item.size} x={0} y={0} class="h-full w-full" />
								{:else if item.type === 'riser'}
									<div
										class="relative h-full w-full rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50"
									>
										<div
											class="absolute right-1 bottom-0.5 text-[8px] text-gray-600 dark:text-gray-300"
										>
											{item.itemData?.riserWidth ?? '?'}' × {item.itemData?.riserDepth ?? '?'}'
										</div>
									</div>
								{:else}
									<img
										src={getCurrentImageSrc(item)}
										alt={item.itemData?.name || item.name || 'Stage Item'}
										draggable="false"
										class="h-full w-full"
										style="pointer-events: none;"
									/>
								{/if}

								{#if item.person_id && item.itemData?.item_type === 'person'}
									{@const person = ps.personsById[item.person_id]}
									{#if person}
										<div
											class="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-gray-800 shadow-sm dark:bg-gray-800/90 dark:text-gray-200"
										>
											{person.name}
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- Full editor canvas with context menus and interactions -->
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							{#snippet child({ props: canvasCtxProps })}
								<div
									{...canvasCtxProps}
									bind:this={canvasEl}
									class="items-container relative overflow-hidden bg-white dark:bg-gray-800"
									style="width: {canvasPixelWidth}px; height: {canvasPixelHeight}px; cursor: {placingItem
										? 'copy'
										: 'default'}"
									onmousemove={handleCanvasMouseMove}
									onclick={handleCanvasClick}
								>
									<CanvasOverlay
										showZones={ps.showZones}
										stageWidth={ps.stageWidth}
										stageDepth={ps.stageDepth}
										{pxPerFoot}
										itemCount={ps.items.length}
									/>

									{#each ps.items as item (item.id)}
										<ContextMenu.Root>
											<ContextMenu.Trigger>
												{#snippet child({ props: itemProps })}
													<div
														{...itemProps}
														class="group selectable-item absolute cursor-move select-none"
														class:ring-2={selectedIdSet.has(item.id)}
														class:ring-blue-500={selectedIdSet.has(item.id)}
														data-id={item.id}
														style="left: {item.position.x * pxPerFoot}px; top: {item.position.y *
															pxPerFoot}px; width: {item.position.width *
															pxPerFoot}px; height: {item.position.height *
															pxPerFoot}px; touch-action: none; pointer-events: {placingItem
															? 'none'
															: 'auto'}; transform: rotate({item.position.rotation ??
															0}deg); transform-origin: center;"
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
																class="relative h-full w-full rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50"
															>
																<div
																	class="absolute right-1 bottom-0.5 text-[8px] text-gray-600 dark:text-gray-300"
																>
																	{item.itemData?.riserWidth ?? '?'}' × {item.itemData
																		?.riserDepth ?? '?'}'
																</div>
															</div>
														{:else}
															<img
																src={getCurrentImageSrc(item)}
																alt={item.itemData?.name || item.name || 'Stage Item'}
																draggable="false"
																class="h-full w-full"
																style="pointer-events: none;"
															/>
														{/if}

														{#if item.person_id && item.itemData?.item_type === 'person'}
															{@const person = ps.personsById[item.person_id]}
															{#if person}
																<div
																	class="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-gray-800 shadow-sm dark:bg-gray-800/90 dark:text-gray-200"
																>
																	{person.name}
																</div>
															{/if}
														{/if}

														{#if selectedIdSet.has(item.id)}
															{#if getVariantKeys(item).length > 1}
																<div
																	class="absolute -bottom-8 left-1/2 z-20 flex -translate-x-1/2 transform gap-1"
																>
																	<button
																		onclick={(e) => {
																			e.stopPropagation();
																			ps.rotateItemRight(item);
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
															{#if item.type === 'riser'}
																<!-- Rotation handle for risers -->
																<div
																	class="pointer-events-none absolute -bottom-10 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center"
																>
																	<div class="h-4 w-px bg-blue-400"></div>
																	<!-- svelte-ignore a11y_no_static_element_interactions -->
																	<div
																		class="pointer-events-auto flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition-colors hover:bg-blue-600"
																		title="Drag to rotate (Shift for 15° snap)"
																		onpointerdown={(e) => handleRotationStart(e, item)}
																		onpointermove={handleRotationMove}
																		onpointerup={handleRotationEnd}
																	>
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			class="h-3.5 w-3.5"
																			viewBox="0 0 20 20"
																			fill="currentColor"
																		>
																			<path
																				fill-rule="evenodd"
																				d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
																				clip-rule="evenodd"
																			/>
																		</svg>
																	</div>
																</div>
															{/if}
														{/if}

														<button
															onclick={(e) => {
																e.stopPropagation();
																ps.deleteItem(item.id);
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
														onSelect={() => ps.duplicateItem(item)}
														class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
														>Duplicate</ContextMenu.Item
													>
													<ContextMenu.Separator class="-mx-1 my-1 block h-px bg-muted" />
													<ContextMenu.Item
														onSelect={() => ps.moveToFront(item.id)}
														class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
														>Bring to Front</ContextMenu.Item
													>
													<ContextMenu.Item
														onSelect={() => ps.moveForward(item.id)}
														class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
														>Bring Forward</ContextMenu.Item
													>
													<ContextMenu.Item
														onSelect={() => ps.moveBackward(item.id)}
														class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
														>Send Backward</ContextMenu.Item
													>
													<ContextMenu.Item
														onSelect={() => ps.moveToBack(item.id)}
														class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
														>Send to Back</ContextMenu.Item
													>
													<ContextMenu.Separator class="-mx-1 my-1 block h-px bg-muted" />
													<ContextMenu.Item
														onSelect={() => ps.deleteItem(item.id)}
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
											style="left: {dragging.ghostX * pxPerFoot}px; top: {dragging.ghostY *
												pxPerFoot}px; width: {dragging.item.position.width *
												pxPerFoot}px; height: {dragging.item.position.height * pxPerFoot}px;"
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
													class="h-full w-full"
													style="pointer-events: none;"
												/>
											{/if}
										</div>
									{/if}

									{#if placingItem}
										<div
											class="pointer-events-none absolute opacity-60"
											style="left: {placingItem.x * pxPerFoot}px; top: {placingItem.y *
												pxPerFoot}px; width: {placingItem.width *
												pxPerFoot}px; height: {placingItem.height * pxPerFoot}px;"
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
													class="h-full w-full"
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
									onSelect={() => (ps.snapping = !ps.snapping)}
									class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
									>Snapping: {ps.snapping ? 'On' : 'Off'}</ContextMenu.Item
								>
							</ContextMenu.Content>
						</ContextMenu.Portal>
					</ContextMenu.Root>
				{/if}
			</div>
		</div>
	{/snippet}

	{#if layoutMode === 'desktop'}
		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<div
				class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
				>
				<div class="flex min-h-0 flex-[3] flex-col overflow-hidden">
					{@render canvasContent()}
				</div>

				<div class="min-h-0 flex-[2] overflow-auto">
					{@render patchContent(6)}
				</div>
			</div>

			<div class="flex w-80 shrink-0 flex-col overflow-hidden">
				<EditorSidePanel
					bind:activeTab={sidePanelTab}
					bind:selectedItemIds
					{selectedChannelNum}
					onPlaceRiser={placeRiser}
					onAddPersonToPlot={addPersonToPlot}
					onPlaceItemForChannel={placeItemForChannel}
				/>
			</div>
		</div>
	{:else if layoutMode === 'medium'}
		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<div
				class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
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
					bind:selectedItemIds
					{selectedChannelNum}
					onPlaceRiser={placeRiser}
					onAddPersonToPlot={addPersonToPlot}
					onPlaceItemForChannel={placeItemForChannel}
				/>
			</div>
		</div>
	{:else}
		<!-- Mobile view-only layout with bottom navigation -->
		<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden pb-14">
			{#if mobileMainTab === 'canvas'}
				<div class="min-h-0 flex-1 overflow-auto p-2">
					{@render canvasContent()}
				</div>
			{:else if mobileMainTab === 'patch'}
				<div class="min-h-0 flex-1 overflow-auto p-2">
					{@render patchContent(2)}
				</div>
			{/if}

			<!-- Bottom navigation bar -->
			<nav
				class="fixed right-0 bottom-0 left-0 z-30 flex border-t border-border-primary bg-surface"
			>
				<button
					type="button"
					onclick={() => (mobileMainTab = 'canvas')}
					class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors {mobileMainTab ===
					'canvas'
						? 'text-text-primary'
						: 'text-text-tertiary'}"
				>
					<!-- Stage/canvas icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
						/>
					</svg>
					Canvas
				</button>
				<button
					type="button"
					onclick={() => (mobileMainTab = 'patch')}
					class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors {mobileMainTab ===
					'patch'
						? 'text-text-primary'
						: 'text-text-tertiary'}"
				>
					<!-- List icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					Patch
				</button>
			</nav>
		</div>
	{/if}
</div>

{#if !viewOnly}
	<!-- Command Palette for Adding Items -->
	<div data-command-palette>
		<ItemCommandPalette
			bind:open={isAddingItem}
			onselect={handleItemSelect}
			onclose={() => {
				isAddingItem = false;
				replacingItemId = null;
				pendingChannelLink = null;
			}}
		/>
	</div>
{/if}

<style>
	.selectable-item:active {
		opacity: 0.8;
	}
	.selectable-item:hover {
		opacity: 0.95;
	}
</style>
