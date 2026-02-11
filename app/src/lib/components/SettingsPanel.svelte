<script lang="ts">
	import { COLOR_CATEGORIES, type ChannelMode } from '@stageplotter/shared';
	import { getPlotState } from '$lib/state/stagePlotState.svelte';

	const COLOR_CATEGORY_LABELS: Record<string, string> = {
		vocals: 'Vocals / Mics',
		drums: 'Drums',
		guitars: 'Guitars',
		bass: 'Bass',
		keys: 'Keys / Piano',
		strings: 'Strings',
		winds: 'Winds',
		percussion: 'Percussion',
		monitors: 'Monitors'
	};

	const ps = getPlotState();

	const channelOptions = $derived(ps.consoleDef?.channelOptions ?? StagePlotState.CHANNEL_OPTIONS);
	const outputOptions = $derived(ps.consoleDef?.outputOptions ?? StagePlotState.CHANNEL_OPTIONS);

	import { StagePlotState } from '$lib/state/stagePlotState.svelte';
</script>

<div class="space-y-6">
	<!-- Console Selection -->
	<div>
		<h3 class="mb-2 text-sm font-medium text-text-primary">Mixing Console</h3>
		<select
			value={ps.consoleType ?? ''}
			onchange={(e) => {
				const val = (e.target as HTMLSelectElement).value;
				ps.setConsoleType(val || null);
			}}
			class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		>
			<option value="">None</option>
			{#each ps.consoleOptions as opt (opt.id)}
				<option value={opt.id}>{opt.name}</option>
			{/each}
			<option disabled>───────────</option>
			<option disabled>Allen & Heath dLive (coming soon)</option>
		</select>
		{#if ps.consoleDef}
			<p class="mt-1.5 text-xs text-text-secondary">
				{ps.consoleDef.inputChannels} input channels &bull; {ps.consoleDef.outputBuses} output buses &bull;
				{ps.consoleDef.colors.length} scribble strip colors
			</p>
		{/if}
	</div>

	<!-- Channel Configuration (side by side) -->
	<div class="flex gap-3">
		<div class="flex-1">
			<h3 class="mb-2 text-sm font-medium text-text-primary">Input Channels</h3>
			<select
				value={ps.inputChannelMode}
				onchange={(e) =>
					ps.setInputChannelMode(Number((e.target as HTMLSelectElement).value) as ChannelMode)}
				class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			>
				{#each channelOptions as option (option)}
					<option value={option}>{option} channels</option>
				{/each}
			</select>
		</div>
		<div class="flex-1">
			<h3 class="mb-2 text-sm font-medium text-text-primary">Output Channels</h3>
			<select
				value={ps.outputChannelMode}
				onchange={(e) =>
					ps.setOutputChannelMode(Number((e.target as HTMLSelectElement).value) as ChannelMode)}
				class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			>
				{#each outputOptions as option (option)}
					<option value={option}>{option} channels</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Category Color Defaults -->
	{#if ps.consoleDef}
		<div>
			<h3 class="mb-2 text-sm font-medium text-text-primary">Default Colors by Category</h3>
			<p class="mb-2 text-xs text-text-secondary">
				When an item is placed on a channel, the channel color will be auto-set based on its
				category.
			</p>
			<div class="space-y-1.5">
				{#each COLOR_CATEGORIES as cat (cat)}
					<div class="flex items-center gap-2">
						<span class="w-20 shrink-0 text-xs text-text-primary"
							>{COLOR_CATEGORY_LABELS[cat] ?? cat}</span
						>
						<div class="flex gap-0.5">
							{#each ps.consoleDef.colors.filter((c: any) => !c.inverted) as color (color.id)}
								<button
									type="button"
									onclick={() =>
										ps.setCategoryColorDefaults({
											...ps.categoryColorDefaults,
											[cat]: color.id
										})}
									class="h-4 w-4 rounded-sm border transition-all hover:scale-110 {ps
										.categoryColorDefaults[cat] === color.id
										? 'scale-110 border-white ring-2 ring-blue-500'
										: 'border-transparent'}"
									style="background-color: {color.hex};"
									title="{color.label} for {COLOR_CATEGORY_LABELS[cat] ?? cat}"
								></button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
