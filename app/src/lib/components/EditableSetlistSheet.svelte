<script lang="ts">
	import type { SetlistSongRow } from '$lib/db/repositories/setlists';

	type Props = {
		songs: SetlistSongRow[];
		setName: string;
		font: number;
		pageSize: number;
		showKeys: boolean;
		showNumbers: boolean;
		selectedSongId?: number | null;
		onreorder?: (fromIndex: number, toIndex: number) => void;
		onremove?: (entryId: number) => void;
		onrename?: (newName: string) => void;
		onaddclick?: () => void;
		onsongclick?: (entry: SetlistSongRow) => void;
	};

	let {
		songs,
		setName,
		font,
		pageSize,
		showKeys,
		showNumbers,
		selectedSongId = null,
		onreorder,
		onremove,
		onrename,
		onaddclick,
		onsongclick
	}: Props = $props();

	const FONTS = ["'DM Sans', sans-serif", "'Fraunces', serif", "'Permanent Marker', cursive"];
	const FONT_WEIGHTS = [600, 700, 400];
	const PAGE_SIZES = {
		0: { w: 816, h: 1056 },
		1: { w: 794, h: 1123 }
	} as const;

	const PADDING = 40;
	const HEADER_HEIGHT = 48;
	const HEADER_GAP = 16;

	let dims = $derived(PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES] ?? PAGE_SIZES[0]);
	let fontFamily = $derived(FONTS[font] ?? FONTS[0]);
	let fontWeight = $derived(FONT_WEIGHTS[font] ?? FONT_WEIGHTS[0]);

	let availableHeight = $derived(dims.h - PADDING * 2 - HEADER_HEIGHT - HEADER_GAP);
	let lineHeight = $derived(songs.length > 0 ? Math.min(availableHeight / songs.length, 68) : 48);
	let fontSize = $derived(Math.min(lineHeight * 0.7, 48));

	// Editable name state
	let editingName = $state(false);
	let nameValue = $state('');

	function startEditName() {
		nameValue = setName;
		editingName = true;
	}

	function commitName() {
		const trimmed = nameValue.trim();
		if (trimmed && trimmed !== setName) {
			onrename?.(trimmed);
		}
		editingName = false;
	}

	// Drag state
	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let dragY = $state(0);
	let dragStartY = $state(0);

	function handlePointerDown(e: PointerEvent, index: number) {
		e.preventDefault();
		e.stopPropagation();
		dragIndex = index;
		dragStartY = e.clientY;
		dragY = 0;
		dragOverIndex = index;
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
	}

	function handlePointerMove(e: PointerEvent) {
		if (dragIndex === null) return;
		dragY = e.clientY - dragStartY;
		const rowsFromStart = Math.round(dragY / lineHeight);
		const target = Math.max(0, Math.min(songs.length - 1, dragIndex + rowsFromStart));
		dragOverIndex = target;
	}

	function handlePointerUp() {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
			onreorder?.(dragIndex, dragOverIndex);
		}
		dragIndex = null;
		dragOverIndex = null;
		dragY = 0;
	}

	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl+';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="setlist-sheet"
	style="
		width: {dims.w}px;
		height: {dims.h}px;
		padding: {PADDING}px;
		font-family: {fontFamily};
		font-weight: {fontWeight};
	"
>
	<div class="setlist-header" style="height: {HEADER_HEIGHT}px; margin-bottom: {HEADER_GAP}px;">
		{#if editingName}
			<input
				bind:value={nameValue}
				class="setlist-header-input"
				onblur={commitName}
				onkeydown={(e) => {
					if (e.key === 'Enter') commitName();
					if (e.key === 'Escape') editingName = false;
				}}
				autofocus
			/>
		{:else}
			<button class="setlist-header-btn" onclick={startEditName} title="Click to rename">
				{setName}
			</button>
		{/if}
	</div>

	<div class="setlist-songs">
		{#each songs as entry, i (entry.id)}
			{@const isDragging = dragIndex === i}
			{@const isTarget = dragOverIndex === i && dragIndex !== null && dragIndex !== i}
			{@const isSelected = selectedSongId != null && entry.song_id === selectedSongId}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="setlist-row-wrapper"
				class:dragging={isDragging}
				class:drag-target-above={isTarget && dragIndex !== null && dragIndex > i}
				class:drag-target-below={isTarget && dragIndex !== null && dragIndex < i}
				class:selected={isSelected}
				style="
					height: {lineHeight}px;
					font-size: {fontSize}px;
					{isDragging ? `transform: translateY(${dragY}px); z-index: 10;` : ''}
				"
				onclick={() => onsongclick?.(entry)}
			>
				<button
					class="drag-handle"
					onpointerdown={(e) => handlePointerDown(e, i)}
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
					<span class="setlist-title">{entry.title}</span>
					{#if showKeys && entry.starting_key}
						<span class="setlist-key">{entry.starting_key}</span>
					{/if}
				</div>
				<button
					class="delete-btn"
					onclick={(e) => {
						e.stopPropagation();
						onremove?.(entry.id);
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

		{#if songs.length === 0}
			<button class="add-prompt" onclick={onaddclick}>
				Press <kbd>{modKey}K</kbd> to add a song
			</button>
		{/if}
	</div>
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
		line-height: 1;
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
