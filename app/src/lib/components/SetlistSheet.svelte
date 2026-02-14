<script lang="ts">
	let {
		songs,
		setName,
		font,
		pageSize,
		showKeys
	}: {
		songs: [string, string][];
		setName: string;
		font: number;
		pageSize: number;
		showKeys: boolean;
	} = $props();

	const FONTS = [
		"'DM Sans', sans-serif",
		"Georgia, 'Times New Roman', serif",
		"'Permanent Marker', cursive"
	];
	const FONT_WEIGHTS = [600, 700, 400];

	// Page dimensions at 96dpi
	const PAGE_SIZES = {
		0: { w: 816, h: 1056 }, // Letter 8.5"x11"
		1: { w: 794, h: 1123 } // A4 8.27"x11.69"
	} as const;

	let dims = $derived(PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES] ?? PAGE_SIZES[0]);
	let fontFamily = $derived(FONTS[font] ?? FONTS[0]);
	let fontWeight = $derived(FONT_WEIGHTS[font] ?? FONT_WEIGHTS[0]);

	// Layout constants (in px)
	const PADDING = 40;
	const HEADER_HEIGHT = 48;
	const HEADER_GAP = 16;

	let availableHeight = $derived(dims.h - PADDING * 2 - HEADER_HEIGHT - HEADER_GAP);
	let lineHeight = $derived(songs.length > 0 ? Math.min(availableHeight / songs.length, 68) : 48);
	let fontSize = $derived(Math.min(lineHeight * 0.7, 48));
</script>

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
		{setName}
	</div>

	{#if songs.length === 0}
		<div class="setlist-empty">No songs in this set</div>
	{:else}
		<div class="setlist-songs">
			{#each songs as [title, key], i}
				<div class="setlist-row" style="height: {lineHeight}px; font-size: {fontSize}px;">
					<span class="setlist-num">{i + 1}.</span>
					<span class="setlist-title">{title}</span>
					{#if showKeys && key}
						<span class="setlist-key">{key}</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.setlist-sheet {
		background: white;
		color: black;
		box-sizing: border-box;
		overflow: hidden;
		border: 1px solid #d4d4d4;
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
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

	.setlist-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 18px;
		color: #999;
		font-weight: 400;
	}

	.setlist-songs {
		display: flex;
		flex-direction: column;
	}

	.setlist-row {
		display: flex;
		align-items: center;
		line-height: 1;
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
</style>
