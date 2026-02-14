<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { modKey } from '$lib/utils/platform';

	let {
		showZones,
		stageWidth,
		stageDepth,
		pxPerFoot,
		itemCount
	}: {
		showZones: boolean;
		stageWidth: number;
		stageDepth: number;
		pxPerFoot: number;
		itemCount: number;
	} = $props();

	// Compute zones once per dimension change (not twice in the template)
	const zones = $derived.by(() => {
		const colWidth = stageWidth / 3;
		const rowHeight = stageDepth / 2;
		return [
			{ key: 'DSR', x: 0, y: rowHeight, w: colWidth, h: rowHeight },
			{ key: 'DSC', x: colWidth, y: rowHeight, w: colWidth, h: rowHeight },
			{ key: 'DSL', x: colWidth * 2, y: rowHeight, w: colWidth, h: rowHeight },
			{ key: 'USR', x: 0, y: 0, w: colWidth, h: rowHeight },
			{ key: 'USC', x: colWidth, y: 0, w: colWidth, h: rowHeight },
			{ key: 'USL', x: colWidth * 2, y: 0, w: colWidth, h: rowHeight }
		];
	});
</script>

<div
	class="bg-grid-pattern pointer-events-none absolute inset-0 bg-[length:20px_20px] opacity-20 dark:opacity-10"
></div>

<!-- Zone guidelines -->
{#if showZones}
	{#key stageWidth + ':' + stageDepth + ':' + pxPerFoot}
		{#each zones as z}
			<div
				class="pointer-events-none absolute"
				style="left:{z.x * pxPerFoot}px; top:{z.y * pxPerFoot}px; width:{z.w *
					pxPerFoot}px; height:{z.h * pxPerFoot}px; border: 1px dashed rgba(0,0,0,0.08);"
			></div>
		{/each}
		{#each zones as z}
			<div
				class="absolute text-[10px] tracking-wide text-black/25 uppercase dark:text-white/25"
				style="left:{(z.x + z.w / 2) * pxPerFoot - 12}px; top:{z.key.startsWith('DS')
					? (z.y + z.h) * pxPerFoot - 18
					: z.y * pxPerFoot + 4}px;"
			>
				{z.key}
			</div>
		{/each}
	{/key}
{/if}

{#if itemCount === 0}
	<div class="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4">
		<p
			class="rounded-full border border-border-primary bg-surface px-5 py-2.5 text-base text-text-secondary shadow-sm"
		>
			Press <kbd
				class="rounded border border-border-primary bg-muted px-1.5 py-0.5 font-mono text-sm"
				>{modKey}K</kbd
			> to add your first item
		</p>
	</div>
{/if}
