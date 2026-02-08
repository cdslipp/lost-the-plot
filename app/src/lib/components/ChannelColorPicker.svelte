<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { ConsoleColor } from '@stageplotter/shared';

	type Props = {
		colors: ConsoleColor[];
		currentColorId: string | null;
		channelNum: number;
		onSelectColor: (channelNum: number, colorId: string) => void;
		children: import('svelte').Snippet;
	};

	let { colors, currentColorId, channelNum, onSelectColor, children }: Props = $props();

	let open = $state(false);

	// Split into normal and inverted for the grid
	const normalColors = $derived(colors.filter((c) => !c.inverted));
	const invertedColors = $derived(colors.filter((c) => c.inverted));

	function handleSelect(colorId: string) {
		onSelectColor(channelNum, colorId);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="w-full h-full">
		{@render children()}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			class="z-50 rounded-lg border border-border-primary bg-surface shadow-xl p-3"
			sideOffset={4}
			align="start"
		>
			<div class="text-xs font-medium text-text-secondary mb-2">Channel {channelNum} Color</div>
			<!-- Normal colors row -->
			<div class="grid grid-cols-8 gap-1.5 mb-2">
				{#each normalColors as color (color.id)}
					<button
						type="button"
						onclick={() => handleSelect(color.id)}
						class="w-7 h-7 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 {currentColorId === color.id ? 'border-white ring-2 ring-blue-500' : 'border-transparent'}"
						style="background-color: {color.hex};"
						title={color.label}
					></button>
				{/each}
			</div>
			<!-- Inverted colors row -->
			{#if invertedColors.length > 0}
				<div class="text-[10px] text-text-secondary mb-1">Inverted</div>
				<div class="grid grid-cols-8 gap-1.5">
					{#each invertedColors as color (color.id)}
						<button
							type="button"
							onclick={() => handleSelect(color.id)}
							class="w-7 h-7 rounded-md border-2 border-dashed transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 {currentColorId === color.id ? 'border-white ring-2 ring-blue-500' : 'border-transparent'}"
							style="background-color: {color.hex};"
							title={color.label}
						></button>
					{/each}
				</div>
			{/if}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
