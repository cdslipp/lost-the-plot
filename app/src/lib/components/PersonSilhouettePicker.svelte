<script lang="ts">
	import { Command } from 'bits-ui';
	import { loadFinalAssets, type ProcessedItem } from '$lib/utils/finalAssetsLoader';

	type Props = {
		open: boolean;
		personName: string;
		onSelect: (item: ProcessedItem) => void;
		onClose: () => void;
	};

	let { open = $bindable(false), personName, onSelect, onClose }: Props = $props();

	let allPeople = $state<ProcessedItem[]>([]);
	let loading = $state(true);

	$effect(() => {
		if (open && allPeople.length === 0) {
			loadFinalAssets().then((items) => {
				allPeople = items.filter((i) => i.type === 'person');
				loading = false;
			});
		}
	});

	function handleSelect(item: ProcessedItem) {
		onSelect(item);
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={onClose} onkeydown={handleKeydown}></div>
		<div class="relative w-[min(500px,90vw)] rounded-xl bg-surface p-6 shadow-lg">
			<h2 class="mb-1 text-lg font-semibold text-text-primary">Choose Silhouette</h2>
			<p class="mb-4 text-sm text-text-secondary">for {personName}</p>

			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"></div>
				</div>
			{:else}
				<div class="grid max-h-[60vh] grid-cols-4 gap-3 overflow-auto">
					{#each allPeople as item (item.id)}
						<button
							onclick={() => handleSelect(item)}
							class="group flex flex-col items-center gap-1.5 rounded-lg border border-border-primary p-2 transition hover:border-stone-500 hover:bg-muted"
						>
							<img
								src={item.image}
								alt={item.name}
								class="h-16 w-auto object-contain"
								draggable="false"
							/>
							<span class="text-[10px] text-text-secondary group-hover:text-text-primary">{item.name}</span>
						</button>
					{/each}
				</div>
			{/if}

			<div class="mt-4 flex justify-end">
				<button
					onclick={onClose}
					class="rounded-lg bg-muted px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
