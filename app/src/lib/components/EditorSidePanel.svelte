<script lang="ts">
	import Inspector from './Inspector.svelte';
	import PlotPeoplePanel from './PlotPeoplePanel.svelte';
	import SettingsPanel from './SettingsPanel.svelte';
	import type { ProcessedItem } from '$lib/utils/finalAssetsLoader';

	type Props = {
		activeTab: 'inspector' | 'people' | 'settings';
		// Inspector-only props
		selectedItemIds: number[];
		selectedChannelNum?: number | null;
		onPlaceRiser: (w: number, d: number, h: number) => void;
		onPlaceItemForChannel?: (channelNum: number) => void;
		// People panel -- needs page-level callback for placement integration
		onAddPersonToPlot: (personId: number, silhouetteItem: ProcessedItem) => void;
	};

	let {
		activeTab = $bindable(),
		selectedItemIds = $bindable<number[]>([]),
		selectedChannelNum = null,
		onPlaceRiser,
		onPlaceItemForChannel,
		onAddPersonToPlot
	}: Props = $props();
</script>

<div
	class="inspector-panel flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm"
>
	<div class="border-b border-border-primary bg-muted/30 px-3 pt-3">
		<div class="flex gap-1">
			<button
				type="button"
				onclick={() => (activeTab = 'inspector')}
				class={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'inspector' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
			>
				Inspector
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'people')}
				class={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'people' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
			>
				People
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'settings')}
				class={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
			>
				Settings
			</button>
		</div>
	</div>
	{#if activeTab === 'inspector'}
		<div class="min-h-0 flex-1 overflow-hidden p-4">
			<Inspector bind:selectedItemIds {selectedChannelNum} {onPlaceRiser} {onPlaceItemForChannel} />
		</div>
	{:else if activeTab === 'people'}
		<div class="min-h-0 flex-1 overflow-auto p-4">
			<PlotPeoplePanel {onAddPersonToPlot} />
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-auto p-4">
			<SettingsPanel />
		</div>
	{/if}
</div>
