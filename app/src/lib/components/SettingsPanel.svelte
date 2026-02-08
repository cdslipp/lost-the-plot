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

<div class="space-y-8">
	<!-- Console Selection -->
	<div>
		<h3 class="text-sm font-medium text-text-primary mb-3">Mixing Console</h3>
		<div class="flex flex-wrap gap-2">
			<button
				onclick={() => onConsoleTypeChange(null)}
				class="px-3 py-2 rounded-lg border text-sm transition-colors {!consoleType ? 'bg-blue-500 text-white border-blue-500' : 'border-border-primary text-text-secondary hover:border-border-primary hover:text-text-primary'}"
			>
				None
			</button>
			{#each consoleOptions as opt (opt.id)}
				<button
					onclick={() => onConsoleTypeChange(opt.id)}
					class="px-3 py-2 rounded-lg border text-sm transition-colors {consoleType === opt.id ? 'bg-blue-500 text-white border-blue-500' : 'border-border-primary text-text-secondary hover:border-border-primary hover:text-text-primary'}"
				>
					{opt.name}
				</button>
			{/each}
		</div>
		{#if consoleDef}
			<p class="text-xs text-text-secondary mt-2">
				{consoleDef.inputChannels} input channels &bull; {consoleDef.outputBuses} output buses &bull; {consoleDef.colors.length} scribble strip colors
			</p>
		{/if}
	</div>

	<!-- Category Color Defaults -->
	{#if consoleDef}
		<div>
			<h3 class="text-sm font-medium text-text-primary mb-3">Default Colors by Category</h3>
			<p class="text-xs text-text-secondary mb-3">When an item is placed on a channel, the channel color will be auto-set based on its category.</p>
			<div class="space-y-2">
				{#each COLOR_CATEGORIES as cat (cat)}
					<div class="flex items-center gap-3">
						<span class="text-xs text-text-primary w-28 shrink-0">{COLOR_CATEGORY_LABELS[cat] ?? cat}</span>
						<div class="flex gap-1">
							{#each consoleDef.colors.filter((c: any) => !c.inverted) as color (color.id)}
								<button
									type="button"
									onclick={() => onCategoryColorDefaultsChange({ ...categoryColorDefaults, [cat]: color.id })}
									class="w-5 h-5 rounded border transition-all hover:scale-110 {categoryColorDefaults[cat] === color.id ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-transparent'}"
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

	<!-- Input Channel Configuration -->
	<div>
		<h3 class="text-sm font-medium text-text-primary mb-3">Input Channels</h3>
		<div class="flex flex-wrap gap-2">
			{#each channelOptions as option (option)}
				<button
					onclick={() => onInputChannelModeChange(option)}
					class="px-3 py-2 rounded-lg border text-sm transition-colors {inputChannelMode === option ? 'bg-blue-500 text-white border-blue-500' : 'border-border-primary text-text-secondary hover:border-border-primary hover:text-text-primary'}"
				>
					{option}
				</button>
			{/each}
		</div>
		<p class="text-xs text-text-secondary mt-2">{inputChannelMode} channels</p>
	</div>

	<!-- Output Channel Configuration -->
	<div>
		<h3 class="text-sm font-medium text-text-primary mb-3">Output Channels</h3>
		<div class="flex flex-wrap gap-2">
			{#each outputOptions as option (option)}
				<button
					onclick={() => onOutputChannelModeChange(option)}
					class="px-3 py-2 rounded-lg border text-sm transition-colors {outputChannelMode === option ? 'bg-blue-500 text-white border-blue-500' : 'border-border-primary text-text-secondary hover:border-border-primary hover:text-text-primary'}"
				>
					{option}
				</button>
			{/each}
		</div>
		<p class="text-xs text-text-secondary mt-2">{outputChannelMode} channels</p>
	</div>
</div>
