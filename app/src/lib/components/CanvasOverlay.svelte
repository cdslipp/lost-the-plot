<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { browser } from '$app/environment';

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	const modKey = isMac ? '⌘' : 'Ctrl+';

	let {
		showZones,
		stageWidth,
		stageDepth,
		pxPerFoot,
		itemCount,
		categoryZoneDefaults = {},
		categoryColorDefaults = {},
		consoleColors = []
	}: {
		showZones: boolean;
		stageWidth: number;
		stageDepth: number;
		pxPerFoot: number;
		itemCount: number;
		categoryZoneDefaults?: Record<string, string>;
		categoryColorDefaults?: Record<string, string>;
		consoleColors?: Array<{ id: string; hex: string; inverted: boolean }>;
	} = $props();

	// Build a reverse map: zone key → category name (for tinting)
	const zoneCategoryMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const [cat, zoneKey] of Object.entries(categoryZoneDefaults)) {
			if (zoneKey) map.set(zoneKey, cat);
		}
		return map;
	});

	// Resolve a category's color to a hex value
	const colorById = $derived.by(() => {
		const map = new Map<string, string>();
		for (const c of consoleColors) {
			if (!c.inverted) map.set(c.id, c.hex);
		}
		return map;
	});

	const GROUP_FALLBACK_COLORS: Record<string, string> = {
		vocals: '#ff0000',
		drums: '#0064ff',
		guitars: '#00c800',
		bass: '#d000d0',
		keys: '#e8e800',
		strings: '#00c8c8',
		winds: '#e0e0e0',
		percussion: '#ff8800',
		monitors: '#1a1a1a'
	};

	function getCategoryHex(cat: string): string {
		const colorId = categoryColorDefaults[cat];
		if (colorId) {
			const hex = colorById.get(colorId);
			if (hex) return hex;
		}
		return GROUP_FALLBACK_COLORS[cat] ?? '#888888';
	}

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
			{@const zoneCat = zoneCategoryMap.get(z.key)}
			<div
				class="pointer-events-none absolute"
				style="left:{z.x * pxPerFoot}px; top:{z.y * pxPerFoot}px; width:{z.w *
					pxPerFoot}px; height:{z.h * pxPerFoot}px; border: 1px dashed rgba(0,0,0,0.08);{zoneCat
					? ` background-color: ${getCategoryHex(zoneCat)}10;`
					: ''}"
			></div>
		{/each}
		{#each zones as z}
			{@const zoneCat = zoneCategoryMap.get(z.key)}
			<div
				class="absolute text-[10px] tracking-wide uppercase {zoneCat
					? 'text-black/40 dark:text-white/40'
					: 'text-black/25 dark:text-white/25'}"
				style="left:{(z.x + z.w / 2) * pxPerFoot - 12}px; top:{z.key.startsWith('DS')
					? (z.y + z.h) * pxPerFoot - 18
					: z.y * pxPerFoot + 4}px;"
			>
				{z.key}{#if zoneCat}<span class="ml-1 text-[8px] capitalize opacity-60">{zoneCat}</span
					>{/if}
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
