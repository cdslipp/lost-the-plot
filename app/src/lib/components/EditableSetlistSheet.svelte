<script lang="ts">
	import type { SetlistSongRow, SetlistType } from '$lib/db/repositories/setlists';
	import { autofocus } from '$lib/actions';

	export type SheetSection = {
		setlistId: number;
		name: string;
		type: SetlistType;
		songs: SetlistSongRow[];
	};

	type Props = {
		sections: SheetSection[];
		font: number;
		pageSize: number;
		showKeys: boolean;
		showNumbers: boolean;
		textCase?: number;
		selectedSongId?: number | null;
		onreorder?: (setlistId: number, fromIndex: number, toIndex: number) => void;
		onremove?: (setlistId: number, entryId: number) => void;
		onrename?: (setlistId: number, newName: string) => void;
		onaddclick?: (setlistId: number) => void;
		onsongclick?: (entry: SetlistSongRow) => void;
		ondeselect?: () => void;
		onmove?: (fromSetlistId: number, entryId: number, toSetlistId: number, toIndex: number) => void;
	};

	let {
		sections,
		font,
		pageSize,
		showKeys,
		showNumbers,
		textCase = 0,
		selectedSongId = null,
		onreorder,
		onremove,
		onrename,
		onaddclick,
		onsongclick,
		ondeselect,
		onmove
	}: Props = $props();

	const FONTS = [
		"'DM Sans', sans-serif",
		"Georgia, 'Times New Roman', serif",
		"'Permanent Marker', cursive"
	];
	const FONT_WEIGHTS = [600, 700, 400];
	const PAGE_SIZES = {
		0: { w: 816, h: 1056 },
		1: { w: 794, h: 1123 }
	} as const;

	const PADDING = 40;
	const HEADER_HEIGHT = 48;
	const HEADER_GAP = 16;
	const ENCORE_HEADER_HEIGHT = 36;
	const ENCORE_HEADER_GAP = 12;

	let dims = $derived(PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES] ?? PAGE_SIZES[0]);
	let fontFamily = $derived(FONTS[font] ?? FONTS[0]);
	let fontWeight = $derived(FONT_WEIGHTS[font] ?? FONT_WEIGHTS[0]);
	let textTransform = $derived(
		textCase === 1 ? 'uppercase' : textCase === 2 ? 'capitalize' : 'none'
	);

	let totalSongCount = $derived(sections.reduce((sum, s) => sum + s.songs.length, 0));
	let encoreCount = $derived(sections.filter((s) => s.type === 'encore').length);

	let availableHeight = $derived(
		dims.h -
			PADDING * 2 -
			HEADER_HEIGHT -
			HEADER_GAP -
			encoreCount * (ENCORE_HEADER_HEIGHT + ENCORE_HEADER_GAP)
	);
	let lineHeight = $derived(
		totalSongCount > 0 ? Math.min(availableHeight / totalSongCount, 68) : 48
	);
	let fontSize = $derived(Math.min(lineHeight * 0.7, 48));

	// Editable name state — keyed by setlistId
	let editingSetlistId = $state<number | null>(null);
	let nameValue = $state('');

	function startEditName(setlistId: number, currentName: string) {
		nameValue = currentName;
		editingSetlistId = setlistId;
	}

	function commitName(setlistId: number) {
		const trimmed = nameValue.trim();
		const section = sections.find((s) => s.setlistId === setlistId);
		if (trimmed && section && trimmed !== section.name) {
			onrename?.(setlistId, trimmed);
		}
		editingSetlistId = null;
	}

	// Drag state — tracks source section and cross-section target
	let dragSectionId = $state<number | null>(null);
	let dragIndex = $state<number | null>(null);
	let dragOverSectionId = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let dragY = $state(0);
	let dragStartY = $state(0);
	let sheetEl = $state<HTMLDivElement | null>(null);

	// Build a flat map of all rows across sections with their Y offsets.
	// The dragged row has a CSS translateY transform, so we subtract it
	// to get the row's original (logical) position in the layout.
	function buildRowMap(): {
		sectionId: number;
		songIndex: number;
		yStart: number;
		yEnd: number;
		isDragSource: boolean;
	}[] {
		if (!sheetEl) return [];
		const rows: {
			sectionId: number;
			songIndex: number;
			yStart: number;
			yEnd: number;
			isDragSource: boolean;
		}[] = [];
		const sheetRect = sheetEl.getBoundingClientRect();

		const songContainers = sheetEl.querySelectorAll('.setlist-songs');
		let sectionIdx = 0;
		for (const container of songContainers) {
			const section = sections[sectionIdx];
			if (!section) break;
			const rowEls = container.querySelectorAll('.setlist-row-wrapper');
			for (let i = 0; i < rowEls.length; i++) {
				const rect = rowEls[i].getBoundingClientRect();
				const isDragSource = section.setlistId === dragSectionId && i === dragIndex;
				// Undo the translateY transform on the dragged row
				const offset = isDragSource ? dragY : 0;
				rows.push({
					sectionId: section.setlistId,
					songIndex: i,
					yStart: rect.top - sheetRect.top - offset,
					yEnd: rect.bottom - sheetRect.top - offset,
					isDragSource
				});
			}
			sectionIdx++;
		}
		return rows;
	}

	function handlePointerDown(e: PointerEvent, sectionId: number, index: number) {
		e.preventDefault();
		e.stopPropagation();
		dragSectionId = sectionId;
		dragIndex = index;
		dragStartY = e.clientY;
		dragY = 0;
		dragOverSectionId = sectionId;
		dragOverIndex = index;
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
	}

	function handlePointerMove(e: PointerEvent) {
		if (dragIndex === null || dragSectionId === null || !sheetEl) return;
		dragY = e.clientY - dragStartY;

		const rowMap = buildRowMap();
		// Filter out the dragged row — we want to find which *other* row we're closest to
		const targets = rowMap.filter((r) => !r.isDragSource);
		if (targets.length === 0) return;

		const sheetRect = sheetEl.getBoundingClientRect();
		const relativeY = e.clientY - sheetRect.top;

		// Find closest non-dragged row
		let closest = targets[0];
		let minDist = Infinity;
		for (const row of targets) {
			const mid = (row.yStart + row.yEnd) / 2;
			const dist = Math.abs(relativeY - mid);
			if (dist < minDist) {
				minDist = dist;
				closest = row;
			}
		}

		dragOverSectionId = closest.sectionId;
		dragOverIndex = closest.songIndex;

		// If cursor is below the closest row's midpoint, target the slot after it
		const closestMid = (closest.yStart + closest.yEnd) / 2;
		if (dragOverSectionId === dragSectionId) {
			// Same-section: adjust index based on drag direction
			if (relativeY > closestMid && closest.songIndex >= dragIndex!) {
				dragOverIndex = closest.songIndex;
			} else if (relativeY <= closestMid && closest.songIndex <= dragIndex!) {
				dragOverIndex = closest.songIndex;
			}
		}
	}

	function handlePointerUp() {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		if (
			dragSectionId !== null &&
			dragIndex !== null &&
			dragOverSectionId !== null &&
			dragOverIndex !== null
		) {
			if (dragOverSectionId === dragSectionId) {
				// Same section reorder
				if (dragIndex !== dragOverIndex) {
					onreorder?.(dragSectionId, dragIndex, dragOverIndex);
				}
			} else {
				// Cross-section move
				const fromSection = sections.find((s) => s.setlistId === dragSectionId);
				if (fromSection) {
					const entry = fromSection.songs[dragIndex];
					if (entry) {
						onmove?.(dragSectionId, entry.id, dragOverSectionId, dragOverIndex);
					}
				}
			}
		}
		dragSectionId = null;
		dragIndex = null;
		dragOverSectionId = null;
		dragOverIndex = null;
		dragY = 0;
	}

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl+';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && selectedSongId != null) ondeselect?.();
	}}
/>
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="setlist-sheet"
	bind:this={sheetEl}
	role="presentation"
	style="
		width: {dims.w}px;
		height: {dims.h}px;
		padding: {PADDING}px;
		font-family: {fontFamily};
		font-weight: {fontWeight};
	"
	onclick={() => ondeselect?.()}
>
	{#each sections as section, sectionIdx (section.setlistId)}
		{#if section.type === 'set'}
			<div class="setlist-header" style="height: {HEADER_HEIGHT}px; margin-bottom: {HEADER_GAP}px;">
				{#if editingSetlistId === section.setlistId}
					<input
						bind:value={nameValue}
						class="setlist-header-input"
						onblur={() => commitName(section.setlistId)}
						onkeydown={(e) => {
							if (e.key === 'Enter') commitName(section.setlistId);
							if (e.key === 'Escape') editingSetlistId = null;
						}}
						use:autofocus
					/>
				{:else}
					<button
						class="setlist-header-btn"
						onclick={() => startEditName(section.setlistId, section.name)}
						title="Click to rename"
					>
						{section.name}
					</button>
				{/if}
			</div>
		{:else}
			<div
				class="encore-header"
				style="height: {ENCORE_HEADER_HEIGHT}px; margin-bottom: {ENCORE_HEADER_GAP}px; margin-top: {sectionIdx >
				0
					? '8px'
					: '0'};"
			>
				{#if editingSetlistId === section.setlistId}
					<input
						bind:value={nameValue}
						class="encore-header-input"
						onblur={() => commitName(section.setlistId)}
						onkeydown={(e) => {
							if (e.key === 'Enter') commitName(section.setlistId);
							if (e.key === 'Escape') editingSetlistId = null;
						}}
						use:autofocus
					/>
				{:else}
					<button
						class="encore-header-btn"
						onclick={() => startEditName(section.setlistId, section.name)}
						title="Click to rename"
					>
						{section.name}
					</button>
				{/if}
			</div>
		{/if}

		<div class="setlist-songs">
			{#each section.songs as entry, i (entry.id)}
				{@const isDragging = dragSectionId === section.setlistId && dragIndex === i}
				{@const isTarget =
					dragOverSectionId === section.setlistId &&
					dragOverIndex === i &&
					dragIndex !== null &&
					!(dragSectionId === section.setlistId && dragIndex === i)}
				{@const isSelected = selectedSongId != null && entry.song_id === selectedSongId}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div
					class="setlist-row-wrapper"
					class:dragging={isDragging}
					class:drag-target-above={isTarget &&
						dragIndex !== null &&
						(dragOverSectionId !== dragSectionId || dragIndex > i)}
					class:drag-target-below={isTarget &&
						dragIndex !== null &&
						dragOverSectionId === dragSectionId &&
						dragIndex < i}
					class:selected={isSelected}
					style="
						height: {lineHeight}px;
						font-size: {fontSize}px;
						{isDragging ? `transform: translateY(${dragY}px); z-index: 10;` : ''}
					"
					onclick={(e) => {
						e.stopPropagation();
						onsongclick?.(entry);
					}}
				>
					<button
						class="drag-handle"
						onpointerdown={(e) => handlePointerDown(e, section.setlistId, i)}
						title="Drag to reorder"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-4 w-4"
						>
							<path
								fill-rule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					<div class="setlist-row">
						{#if showNumbers}
							<span class="setlist-num">{i + 1}.</span>
						{/if}
						<span class="setlist-title" style="text-transform: {textTransform}">{entry.title}</span>
						{#if showKeys && entry.starting_key}
							<span class="setlist-key">{entry.starting_key}</span>
						{/if}
					</div>
					<button
						class="delete-btn"
						onclick={(e) => {
							e.stopPropagation();
							onremove?.(section.setlistId, entry.id);
						}}
						title="Remove song"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-4 w-4"
						>
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			{/each}

			{#if section.songs.length === 0 && sectionIdx === 0}
				<button class="add-prompt" onclick={() => onaddclick?.(section.setlistId)}>
					Press <kbd>{modKey}K</kbd> to add a song
				</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.setlist-sheet {
		background: white;
		color: black;
		box-sizing: border-box;
		overflow: hidden;
		border: 1px solid #d4d4d4;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
		position: relative;
	}

	.setlist-header {
		display: flex;
		align-items: center;
		font-size: 20px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 2px solid black;
		padding-bottom: 8px;
	}

	.setlist-header-btn {
		all: unset;
		cursor: pointer;
		border-bottom: 1px dashed transparent;
		transition: border-color 0.15s;
	}

	.setlist-header-btn:hover {
		border-bottom-color: #999;
	}

	.setlist-header-input {
		all: unset;
		width: 100%;
		border-bottom: 1px solid black;
	}

	.encore-header {
		display: flex;
		align-items: center;
		font-size: 16px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid #666;
		padding-bottom: 6px;
	}

	.encore-header-btn {
		all: unset;
		cursor: pointer;
		border-bottom: 1px dashed transparent;
		transition: border-color 0.15s;
		font-style: italic;
	}

	.encore-header-btn:hover {
		border-bottom-color: #999;
	}

	.encore-header-input {
		all: unset;
		width: 100%;
		border-bottom: 1px solid #666;
		font-style: italic;
	}

	.setlist-songs {
		display: flex;
		flex-direction: column;
	}

	.setlist-row-wrapper {
		display: flex;
		align-items: center;
		position: relative;
		transition: background-color 0.15s;
	}

	.setlist-row-wrapper:hover {
		background: rgb(0 0 0 / 0.03);
	}

	.setlist-row-wrapper.selected {
		outline: 2px solid #78716c;
		outline-offset: -2px;
		border-radius: 4px;
		background: rgb(0 0 0 / 0.02);
	}

	.setlist-row-wrapper.dragging {
		background: rgb(0 0 0 / 0.05);
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.15);
		border-radius: 4px;
	}

	.setlist-row-wrapper.drag-target-above {
		border-top: 2px solid #3b82f6;
	}

	.setlist-row-wrapper.drag-target-below {
		border-bottom: 2px solid #3b82f6;
	}

	.drag-handle {
		all: unset;
		cursor: grab;
		padding: 0 4px;
		color: transparent;
		transition: color 0.15s;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		touch-action: none;
	}

	.setlist-row-wrapper:hover .drag-handle {
		color: #999;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.setlist-row {
		display: flex;
		align-items: center;
		line-height: 1.15;
		flex: 1;
		min-width: 0;
	}

	.setlist-num {
		width: 2.5em;
		text-align: right;
		padding-right: 0.5em;
		flex-shrink: 0;
		opacity: 0.5;
	}

	.setlist-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.setlist-key {
		flex-shrink: 0;
		padding-left: 1em;
		text-align: right;
		opacity: 0.7;
	}

	.delete-btn {
		all: unset;
		cursor: pointer;
		padding: 2px;
		color: transparent;
		transition: color 0.15s;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		border-radius: 4px;
	}

	.setlist-row-wrapper:hover .delete-btn {
		color: #ccc;
	}

	.delete-btn:hover {
		color: #ef4444 !important;
		background: rgb(239 68 68 / 0.1);
	}

	.add-prompt {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		color: #999;
		font-size: 14px;
		font-weight: 400;
		transition: color 0.15s;
	}

	.add-prompt:hover {
		color: #666;
	}

	.add-prompt kbd {
		display: inline-block;
		padding: 1px 6px;
		margin: 0 2px;
		font-size: 0.85em;
		font-family: inherit;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: #f5f5f5;
		box-shadow: 0 1px 0 #bbb;
	}

	@media print {
		.drag-handle,
		.delete-btn,
		.add-prompt {
			display: none !important;
		}

		.setlist-row-wrapper:hover {
			background: transparent;
		}

		.setlist-sheet {
			border: none;
			box-shadow: none;
		}
	}
</style>
