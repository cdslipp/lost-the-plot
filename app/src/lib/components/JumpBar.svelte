<script lang="ts">
	import { Command } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { getAllBands, type BandRow } from '$lib/db/repositories/bands';
	import { getAllPlotsWithBandName, type PlotWithBand } from '$lib/db/repositories/plots';

	type Props = {
		open?: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	let bands = $state<BandRow[]>([]);
	let plots = $state<PlotWithBand[]>([]);
	let searchValue = $state('');

	$effect(() => {
		if (open) {
			searchValue = '';
			loadData();
		}
	});

	async function loadData() {
		const [b, p] = await Promise.all([getAllBands(), getAllPlotsWithBandName()]);
		bands = b;
		plots = p;
	}

	function fuzzyFilter(value: string, search: string, keywords?: string[]): number {
		if (!search.trim()) return 1;
		const searchLower = search.toLowerCase().replace(/\s+/g, '');
		const target = (keywords ? `${value} ${keywords.join(' ')}` : value).toLowerCase();
		let j = 0;
		for (let i = 0; i < target.length && j < searchLower.length; i++) {
			if (target[i] === searchLower[j]) j++;
		}
		if (j < searchLower.length) return 0;
		return searchLower.length / target.length;
	}

	function selectBand(band: BandRow) {
		open = false;
		goto(`/bands/${band.id}`);
	}

	function selectPlot(plot: PlotWithBand) {
		open = false;
		goto(`/bands/${plot.band_id}/plots/${plot.id}`);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			open = false;
		}
	}

	function handleBackdropClick() {
		open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={handleBackdropClick}
			onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		></div>
		<div class="relative mx-4 w-[min(500px,95vw)]">
			<Command.Root
				class="flex flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-2xl"
				shouldFilter={true}
				filter={fuzzyFilter}
				loop={true}
			>
				<div class="border-b border-border-primary px-4 py-3">
					<Command.Input
						bind:value={searchValue}
						class="w-full bg-transparent text-lg outline-none placeholder:text-text-secondary"
						placeholder="Jump to band or plot..."
						autofocus
					/>
				</div>

				<Command.List class="flex-1 overflow-hidden">
					<Command.Viewport class="max-h-[50vh] overflow-y-auto p-2">
						<Command.Empty class="py-8 text-center text-text-secondary">
							No results found.
						</Command.Empty>

						{#if bands.length > 0}
							<Command.Group>
								<Command.GroupHeading
									class="px-2 py-2 text-xs font-semibold tracking-wider text-text-secondary uppercase"
								>
									Bands
								</Command.GroupHeading>
								<Command.GroupItems>
									{#each bands as band (band.id)}
										<Command.Item
											value={band.name}
											class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted data-[selected]:bg-muted"
											onSelect={() => selectBand(band)}
										>
											<span class="text-sm font-medium text-text-primary">{band.name}</span>
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						{/if}

						{#if plots.length > 0}
							<Command.Group>
								<Command.GroupHeading
									class="px-2 py-2 text-xs font-semibold tracking-wider text-text-secondary uppercase"
								>
									Plots
								</Command.GroupHeading>
								<Command.GroupItems>
									{#each plots as plot (plot.id)}
										<Command.Item
											value={`${plot.name} ${plot.band_name}`}
											class="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted data-[selected]:bg-muted"
											onSelect={() => selectPlot(plot)}
										>
											<span class="text-sm font-medium text-text-primary">{plot.name}</span>
											<span class="text-xs text-text-tertiary">{plot.band_name}</span>
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						{/if}
					</Command.Viewport>
				</Command.List>

				<div class="border-t border-border-primary bg-muted/30 px-4 py-2">
					<div class="flex items-center justify-between text-xs text-text-secondary">
						<div class="flex items-center gap-4">
							<span>↑↓ Navigate</span>
							<span>↵ Jump</span>
							<span>ESC Close</span>
						</div>
					</div>
				</div>
			</Command.Root>
		</div>
	</div>
{/if}
