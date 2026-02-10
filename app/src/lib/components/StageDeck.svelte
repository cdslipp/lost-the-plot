<script lang="ts">
	import { STAGE_SIZES, formatFeetDimensions } from '$lib/utils/scale';

	type StageDeckSize = '4x4' | '4x8' | '8x8';

	let {
		size = $bindable<StageDeckSize>('4x4'),
		x = $bindable<number>(0),
		y = $bindable<number>(0),
		selected = $bindable<boolean>(false),
		id = $bindable<string>(''),
		class: className = ''
	} = $props();

	const stageSize = $derived(STAGE_SIZES[size]);
	const dimensions = $derived(formatFeetDimensions(stageSize.width, stageSize.height));
	// SVG coordinate scale: multiply feet by this to get reasonable SVG units for stroke/text
	const S = 28; // ~28 SVG units per foot (similar to old pixel scale)
	const svgW = $derived(stageSize.width * S);
	const svgH = $derived(stageSize.height * S);
</script>

<!-- Stage deck as SVG -->
<svg
	class="stage-deck {className} {selected ? 'selected' : ''}"
	viewBox="0 0 {svgW} {svgH}"
	style="position: absolute; left: {x}px; top: {y}px;"
	data-id={id}
	role="img"
	aria-label="Stage deck {dimensions}"
>
	<!-- Main deck surface -->
	<rect
		x="0"
		y="0"
		width={svgW}
		height={svgH}
		fill="#D4AF37"
		stroke="#B8860B"
		stroke-width="2"
		rx="4"
		ry="4"
	/>

	<!-- Wood grain lines for texture -->
	{#each Array(Math.floor(svgH / 8)) as _, i}
		<line
			x1="4"
			y1={8 + i * 8}
			x2={svgW - 4}
			y2={8 + i * 8}
			stroke="#B8860B"
			stroke-width="0.5"
			opacity="0.3"
		/>
	{/each}

	<!-- Corner reinforcements -->
	{#each [[4, 4], [svgW - 12, 4], [4, svgH - 12], [svgW - 12, svgH - 12]] as [cornerX, cornerY]}
		<rect x={cornerX} y={cornerY} width="8" height="8" fill="#8B7355" rx="1" />
	{/each}

	<!-- Size label (only show if deck is large enough) -->
	{#if svgW > 60 && svgH > 40}
		<text
			x={svgW / 2}
			y={svgH / 2 - 4}
			text-anchor="middle"
			font-family="Arial, sans-serif"
			font-size="10"
			font-weight="bold"
			fill="#8B4513"
			opacity="0.7"
		>
			STAGE
		</text>
		<text
			x={svgW / 2}
			y={svgH / 2 + 8}
			text-anchor="middle"
			font-family="Arial, sans-serif"
			font-size="8"
			fill="#8B4513"
			opacity="0.6"
		>
			{size.replace('x', ' × ')}
		</text>
	{/if}
</svg>

<style>
	.stage-deck {
		cursor: move;
		transition: opacity 0.2s ease;
	}

	.stage-deck:hover {
		opacity: 0.9;
	}

	.stage-deck.selected {
		filter: drop-shadow(0 0 4px #2563eb);
	}

	.stage-deck:hover rect:first-child {
		fill: #daa520;
	}
</style>
