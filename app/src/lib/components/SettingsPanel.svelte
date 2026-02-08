<script lang="ts">
	import { COLOR_CATEGORIES } from '@stageplotter/shared';

	type ChannelMode = 8 | 16 | 24 | 32 | 48;

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

	type Props = {
		consoleType: string | null;
		consoleDef: any | null;
		consoleOptions: { id: string; name: string }[];
		categoryColorDefaults: Record<string, string>;
		inputChannelMode: number;
		outputChannelMode: number;
		channelOptions: number[];
		outputOptions: number[];
		onConsoleTypeChange: (type: string | null) => void;
		onCategoryColorDefaultsChange: (defaults: Record<string, string>) => void;
		onInputChannelModeChange: (mode: number) => void;
		onOutputChannelModeChange: (mode: number) => void;
	};

	let {
		consoleType,
		consoleDef,
		consoleOptions,
		categoryColorDefaults,
		inputChannelMode,
		outputChannelMode,
		channelOptions,
		outputOptions,
		onConsoleTypeChange,
		onCategoryColorDefaultsChange,
		onInputChannelModeChange,
		onOutputChannelModeChange
	}: Props = $props();
</script>

<div class="space-y-6">
	<!-- Console Selection -->
	<div>
		<h3 class="text-sm font-medium text-text-primary mb-2">Mixing Console</h3>
		<select
			value={consoleType ?? ''}
			onchange={(e) => {
				const val = (e.target as HTMLSelectElement).value;
				onConsoleTypeChange(val || null);
			}}
			class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
		>
			<option value="">None</option>
			{#each consoleOptions as opt (opt.id)}
				<option value={opt.id}>{opt.name}</option>
			{/each}
			<option disabled>───────────</option>
			<option disabled>Allen & Heath dLive (coming soon)</option>
			<option disabled>Allen & Heath SQ (coming soon)</option>
		</select>
		{#if consoleDef}
			<p class="text-xs text-text-secondary mt-1.5">
				{consoleDef.inputChannels} input channels &bull; {consoleDef.outputBuses} output buses &bull; {consoleDef.colors.length} scribble strip colors
			</p>
		{/if}
	</div>

	<!-- Channel Configuration (side by side) -->
	<div class="flex gap-3">
		<div class="flex-1">
			<h3 class="text-sm font-medium text-text-primary mb-2">Input Channels</h3>
			<select
				value={inputChannelMode}
				onchange={(e) => onInputChannelModeChange(Number((e.target as HTMLSelectElement).value))}
				class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>
				{#each channelOptions as option (option)}
					<option value={option}>{option} channels</option>
				{/each}
			</select>
		</div>
		<div class="flex-1">
			<h3 class="text-sm font-medium text-text-primary mb-2">Output Channels</h3>
			<select
				value={outputChannelMode}
				onchange={(e) => onOutputChannelModeChange(Number((e.target as HTMLSelectElement).value))}
				class="w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>
				{#each outputOptions as option (option)}
					<option value={option}>{option} channels</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Category Color Defaults -->
	{#if consoleDef}
		<div>
			<h3 class="text-sm font-medium text-text-primary mb-2">Default Colors by Category</h3>
			<p class="text-xs text-text-secondary mb-2">When an item is placed on a channel, the channel color will be auto-set based on its category.</p>
			<div class="space-y-1.5">
				{#each COLOR_CATEGORIES as cat (cat)}
					<div class="flex items-center gap-2">
						<span class="text-xs text-text-primary w-20 shrink-0">{COLOR_CATEGORY_LABELS[cat] ?? cat}</span>
						<div class="flex gap-0.5">
							{#each consoleDef.colors.filter((c: any) => !c.inverted) as color (color.id)}
								<button
									type="button"
									onclick={() => onCategoryColorDefaultsChange({ ...categoryColorDefaults, [cat]: color.id })}
									class="w-4 h-4 rounded-sm border transition-all hover:scale-110 {categoryColorDefaults[cat] === color.id ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent'}"
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
