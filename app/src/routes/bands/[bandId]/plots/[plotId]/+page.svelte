<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { ItemCommandPalette, StagePatch } from '$lib';
	import type { ProcessedItem } from '$lib/utils/finalAssetsLoader';
	import Selecto from 'selecto';
	import { onClickOutside, PressedKeys } from 'runed';
	import StageDeck from '$lib/components/StageDeck.svelte';
	import { ContextMenu } from 'bits-ui';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import EditorToolbar from '$lib/components/EditorToolbar.svelte';
	import EditorSidePanel from '$lib/components/EditorSidePanel.svelte';
	import CanvasOverlay from '$lib/components/CanvasOverlay.svelte';
	import { exportToPdf } from '$lib/utils/pdf';
	import { feetToPixels } from '$lib/utils/scale';
	import { browser } from '$app/environment';
	import { getVariantKeys, getCurrentImageSrc } from '$lib/utils/canvasUtils';
	import { StagePlotState, setPlotState } from '$lib/state/stagePlotState.svelte';

	// --- Route params ---
	let plotId = $derived($page.params.plotId);
	let bandId = $derived($page.params.bandId);

	// --- State class (source of truth) ---
	const ps = new StagePlotState($page.params.plotId!, $page.params.bandId!);
	setPlotState(ps);

	// --- UI-only layout state ---
	let layoutMode = $state<'mobile' | 'medium' | 'desktop'>('desktop');
	let viewOnly = $derived(layoutMode === 'mobile');
	let sidePanelTab = $state<'inspector' | 'people' | 'settings'>('inspector');
	let mediumMainTab = $state<'canvas' | 'patch'>('canvas');
	let mobileMainTab = $state<'canvas' | 'patch' | 'panel'>('canvas');
	let mobilePanelTab = $state<'inspector' | 'people' | 'settings'>('inspector');

	// --- Canvas DOM refs ---
	let canvasEl = $state<HTMLElement | null>(null);
	let canvasResizeObserver: ResizeObserver | null = null;
	let stagePlotContainer = $state<HTMLElement | null>(null);

	// --- Selection & interaction state (DOM-coupled) ---
	let selectedItems = $state<any[]>([]);
	const selectedIds = $derived(
		new Set(selectedItems.map((el: any) => el.dataset?.id).filter(Boolean))
	);
	let isAddingItem = $state(false);
	let replacingItemId = $state<number | null>(null);
	let placingItem = $state<any>(null);
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

	// --- Keyboard ---
	const keys = new PressedKeys();
	const isAltPressed = $derived(keys.has('Alt'));

	function nudgeSelected(dx: number, dy: number) {
		if (!selectedItems.length) return;
		selectedItems.forEach((el) => {
			const id = parseInt(el.dataset?.id || '0');
			const item = ps.items.find((i: any) => i.id === id);
			if (!item) return;
			const newX = Math.max(
				0,
				Math.min(ps.canvasWidth - item.position.width, item.position.x + dx)
			);
			const newY = Math.max(
				0,
				Math.min(ps.canvasHeight - item.position.height, item.position.y + dy)
			);
			item.position.x = newX;
			item.position.y = newY;
		});
		ps.commitChange();
	}

	function deleteSelected() {
		if (!selectedItems.length) return;
		const ids = new Set(selectedItems.map((el: any) => String(el.dataset?.id || '0')));
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

	keys.onKeys(['ArrowUp'], () => nudgeSelected(0, -1));
	keys.onKeys(['ArrowDown'], () => nudgeSelected(0, 1));
	keys.onKeys(['ArrowLeft'], () => nudgeSelected(-1, 0));
	keys.onKeys(['ArrowRight'], () => nudgeSelected(1, 0));
	keys.onKeys(['Delete'], handleDeleteHotkey);
	keys.onKeys(['Backspace'], handleDeleteHotkey);

	// --- Selection helpers ---
	function clearSelections() {
		if (selecto && selectedItems.length > 0) {
			selectedItems = [];
			selecto.setSelectedTargets([]);
		}
	}

	function selectItemByIndex(index: number) {
		if (ps.items.length === 0) return;
		const item = ps.items[index];
		if (!item) return;
		const el = canvasEl?.querySelector(`[data-id="${item.id}"]`) as HTMLElement | null;
		if (!el) return;
		clearSelections();
		selectedItems = [el];
		selecto?.setSelectedTargets([el]);
		el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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

	// --- Selecto lifecycle ---
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

	// --- Canvas resize observer ---
	$effect(() => {
		if (!browser || !canvasEl) return;
		canvasResizeObserver?.disconnect();
		canvasResizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (!width || !height) return;
				if (width === ps.canvasWidth && height === ps.canvasHeight) return;
				ps.canvasWidth = width;
				ps.canvasHeight = height;
			}
		});
		canvasResizeObserver.observe(canvasEl);
		const rect = canvasEl.getBoundingClientRect();
		const initialWidth = rect.width || 1100;
		const initialHeight = rect.height || 850;
		if (initialWidth !== ps.canvasWidth || initialHeight !== ps.canvasHeight) {
			ps.canvasWidth = initialWidth;
			ps.canvasHeight = initialHeight;
		}

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

		const idx = ps.items.findIndex((i: any) => i.id === targetId);
		if (idx === -1) return;

		const existing = ps.items[idx];
		const img = new Image();
		img.src = newItemData.image;
		await new Promise((resolve) => {
			img.onload = resolve;
			img.onerror = () => resolve(undefined);
		});
		const newWidth = img.naturalWidth || 80;
		const newHeight = img.naturalHeight || 60;

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
			const rect = canvasEl.getBoundingClientRect();
			let x = event.clientX - rect.left - placingItem.width / 2;
			let y = event.clientY - rect.top - placingItem.height / 2;
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
			const rect = canvasEl.getBoundingClientRect();
			const rawX = event.clientX - rect.left - placingItem.width / 2;
			const rawY = event.clientY - rect.top - placingItem.height / 2;
			const snapped = ps.snapToGrid(rawX, rawY, placingItem.width, placingItem.height);

			const newItem: any = {
				id: Date.now(),
				type: placingItem.type,
				itemData: placingItem.itemData,
				currentVariant: 'default',
				position: {
					width: placingItem.width,
					height: placingItem.height,
					x: Math.max(0, Math.min(snapped.x, ps.canvasWidth - placingItem.width)),
					y: Math.max(0, Math.min(snapped.y, ps.canvasHeight - placingItem.height))
				},
				name: placingItem.itemData?.name || '',
				channel: '',
				person_id: placingItem.person_id ?? null
			};

			let ch = placingItem.channel;
			if (ch == null && placingItem.type === 'input') {
				ch = ps.getNextAvailableChannel();
			}
			newItem.channel = ch != null ? String(ch) : '';
			ps.items.push(newItem);

			const isMonitor = ps.isMonitorItem(placingItem.itemData);
			const defaultInputs = isMonitor ? null : placingItem.itemData?.default_inputs;
			if (defaultInputs && Array.isArray(defaultInputs)) {
				defaultInputs.forEach((inputDef: any, idx: number) => {
					ps.items.push({
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

			ps.addDefaultOutputs(placingItem.itemData);
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

	// --- People (thin wrappers that integrate with placingItem) ---
	async function addPersonToPlot(personId: number, silhouetteItem: ProcessedItem) {
		await ps.addPersonToPlot(personId, silhouetteItem);
		await preparePlacingItem(silhouetteItem);
		if (placingItem) {
			placingItem.person_id = personId;
		}
	}

	async function createPerson(name: string): Promise<number> {
		return ps.createAndAddPerson(name);
	}

	// --- Drag handlers ---
	function handleItemPointerDown(event: PointerEvent, item: any) {
		if (event.button !== 0) return;
		if (placingItem) return;
		if ((event.target as HTMLElement).closest('button')) return;

		const el = event.currentTarget as HTMLElement;
		el.setPointerCapture(event.pointerId);

		const canvasRect = canvasEl!.getBoundingClientRect();

		const isInSelection = selectedIds.has(String(item.id));
		let group: Array<{ item: any; startX: number; startY: number }>;
		if (isInSelection && selectedItems.length > 1) {
			group = selectedItems
				.map((el) => {
					const id = parseInt(el.dataset?.id || '0');
					const groupItem = ps.items.find((i: any) => i.id === id);
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
			dragging.item.position.x = dragging.startX;
			dragging.item.position.y = dragging.startY;
			const clampedX = Math.max(0, Math.min(rawX, ps.canvasWidth - dragging.item.position.width));
			const clampedY = Math.max(0, Math.min(rawY, ps.canvasHeight - dragging.item.position.height));
			dragging.ghostX = clampedX;
			dragging.ghostY = clampedY;
		} else {
			for (const entry of dragging.group) {
				const newX = entry.startX + deltaX;
				const newY = entry.startY + deltaY;
				entry.item.position.x = Math.max(
					0,
					Math.min(newX, ps.canvasWidth - entry.item.position.width)
				);
				entry.item.position.y = Math.max(
					0,
					Math.min(newY, ps.canvasHeight - entry.item.position.height)
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
				const x = Math.max(0, Math.min(snapped.x, ps.canvasWidth - dragging.item.position.width));
				const y = Math.max(0, Math.min(snapped.y, ps.canvasHeight - dragging.item.position.height));
				ps.duplicateItem(dragging.item, { position: { ...dragging.item.position, x, y } });
			} else {
				for (const entry of dragging.group) {
					const snapped = ps.snapToGrid(
						entry.item.position.x,
						entry.item.position.y,
						entry.item.position.width,
						entry.item.position.height
					);
					const x = Math.max(0, Math.min(snapped.x, ps.canvasWidth - entry.item.position.width));
					const y = Math.max(0, Math.min(snapped.y, ps.canvasHeight - entry.item.position.height));
					entry.item.position.x = x;
					entry.item.position.y = y;
				}
				ps.commitChange();
			}
			justSelected = true;
		}

		dragging = null;
	}

	// --- Patch handlers (thin wrappers) ---
	function handlePatchItemUpdate(itemId: number, property: string, value: string) {
		ps.updateItemProperty(itemId, property, value);
	}

	function handlePatchAddItem(item: any, channel: number) {
		ps.preparePatchChannel(channel, item);
		preparePlacingItem(item, channel);
	}

	function handlePatchOutputSelect(item: any, channel: number) {
		ps.outputs = ps.outputs.filter((o: any) => o.channel !== String(channel));
		if (item) {
			ps.outputs.push({
				id: Date.now(),
				name: item.name,
				channel: String(channel),
				itemData: item
			});
		}
		ps.debouncedWrite();
	}

	// --- Riser placement ---
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

	// --- PDF export ---
	async function handleExportPdf() {
		if (!canvasEl) return;
		await exportToPdf({
			plotName: ps.plotName,
			canvasEl,
			items: ps.items.map((i: any) => ({
				name: i.name,
				channel: i.channel,
				person_name: i.person_id ? ps.personsById[i.person_id]?.name || '' : ''
			})),
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

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="flex h-[calc(100dvh-4.25rem)] flex-col gap-3 overflow-hidden">
	<div class="shrink-0">
		<EditorToolbar
			onAddItem={openAddMenu}
			onImportComplete={handleImportComplete}
			onExportPdf={handleExportPdf}
			backHref={'/bands/' + bandId}
			{viewOnly}
		/>
	</div>

	{#snippet patchContent(columnCount: number)}
		<StagePatch
			items={ps.items}
			outputs={ps.outputs}
			{columnCount}
			readonly={viewOnly}
			onUpdateItem={handlePatchItemUpdate}
			onReorderPatch={(from, to) => ps.reorderItems(from, to)}
			onSelectItem={openItemEditor}
			onAddItem={handlePatchAddItem}
			onRemoveItem={(ch) => ps.removePatchItem(ch)}
			onClearPatch={() => ps.clearAllPatch()}
			onOutputSelect={handlePatchOutputSelect}
			onOutputRemove={(ch) => ps.removeOutput(ch)}
			consoleType={ps.consoleType}
			channelColors={ps.channelColors}
			onChannelColorChange={(ch, color) => ps.setChannelColor(ch, color)}
			stereoLinks={ps.stereoLinks}
			onStereoLinksChange={(links) => ps.setStereoLinks(links)}
			outputStereoLinks={ps.outputStereoLinks}
			onOutputStereoLinksChange={(links) => ps.setOutputStereoLinks(links)}
			categoryColorDefaults={ps.categoryColorDefaults}
			inputChannelMode={ps.inputChannelMode}
			outputChannelMode={ps.outputChannelMode}
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
							style="aspect-ratio: {ps.stageWidth}/{ps.stageDepth}; max-width: 1100px; cursor: {placingItem
								? 'copy'
								: 'default'}"
							onmousemove={handleCanvasMouseMove}
							onclick={handleCanvasClick}
						>
							<CanvasOverlay
								showZones={ps.showZones}
								canvasWidth={ps.canvasWidth}
								canvasHeight={ps.canvasHeight}
								itemCount={ps.items.length}
							/>

							{#each ps.items as item (item.id)}
								<ContextMenu.Root>
									<ContextMenu.Trigger>
										{#snippet child({ props: itemProps })}
											<div
												{...itemProps}
												class="group selectable-item absolute cursor-move select-none"
												class:ring-2={selectedIds.has(String(item.id))}
												class:ring-blue-500={selectedIds.has(String(item.id))}
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
													{@const person = ps.personsById[item.person_id]}
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
							onSelect={() => (ps.snapping = !ps.snapping)}
							class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
							>Snapping: {ps.snapping ? 'On' : 'Off'}</ContextMenu.Item
						>
					</ContextMenu.Content>
				</ContextMenu.Portal>
			</ContextMenu.Root>
		</div>

		<div class="mt-1.5 flex justify-between text-xs text-text-tertiary">
			<div class="flex items-center gap-3">
				Items: {ps.items.length} | People: {ps.plotPersonIds.size}
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
				<div class="flex min-h-0 flex-[2] flex-col overflow-hidden">
					{@render canvasContent()}
				</div>

				<div class="min-h-0 flex-1 max-h-[500px] overflow-hidden">
					{@render patchContent(6)}
				</div>
			</div>

			<div class="flex w-80 shrink-0 flex-col overflow-hidden">
				<EditorSidePanel
					bind:activeTab={sidePanelTab}
					bind:selectedItems
					onPlaceRiser={placeRiser}
					onAddPersonToPlot={addPersonToPlot}
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
					onPlaceRiser={placeRiser}
					onAddPersonToPlot={addPersonToPlot}
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
							onPlaceRiser={placeRiser}
							onAddPersonToPlot={addPersonToPlot}
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
