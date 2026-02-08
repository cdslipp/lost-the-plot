<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { browser } from '$app/environment';

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	const modKey = isMac ? '⌘' : 'Ctrl+';

	let {
		showZones,
		canvasWidth,
		canvasHeight,
		itemCount
	}: {
		showZones: boolean;
		canvasWidth: number;
		canvasHeight: number;
		itemCount: number;
	} = $props();

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
</script>

<div
	class="bg-grid-pattern pointer-events-none absolute inset-0 bg-[length:20px_20px] opacity-20 dark:opacity-10"
></div>

<!-- Zone guidelines -->
{#if showZones}
	{#key canvasWidth + ':' + canvasHeight}
		{#each getZones(canvasWidth, canvasHeight) as z}
			<div
				class="pointer-events-none absolute"
				style="left:{z.x}px; top:{z.y}px; width:{z.w}px; height:{z.h}px; border: 1px dashed rgba(0,0,0,0.08);"
			></div>
		{/each}
		{#each getZones(canvasWidth, canvasHeight) as z}
			<div
				class="absolute text-[10px] tracking-wide text-black/25 uppercase dark:text-white/25"
				style="left:{z.x + z.w / 2 - 12}px; top:{z.key.startsWith('DS')
					? z.y + z.h - 18
					: z.y + 4}px;"
			>
				{z.key}
			</div>
		{/each}
	{/key}
{/if}

{#if itemCount === 0}
	<div class="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4">
		<p class="text-lg text-text-secondary">
			Press <kbd
				class="rounded border border-border-primary bg-muted px-1.5 py-0.5 font-mono text-sm"
				>{modKey}K</kbd
			> to add your first item
		</p>
	</div>
{/if}
