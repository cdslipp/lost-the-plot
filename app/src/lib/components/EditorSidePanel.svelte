<script lang="ts">
	import Inspector from './Inspector.svelte';
	import PlotPeoplePanel from './PlotPeoplePanel.svelte';
	import SettingsPanel from './SettingsPanel.svelte';
	import type { UnitSystem } from '$lib/utils/scale';
	import type { ProcessedItem } from '$lib/utils/finalAssetsLoader';
	import type { StagePlotItem } from '@stageplotter/shared';

	type Props = {
		activeTab: 'inspector' | 'people' | 'settings';
		// Inspector props (forwarded with $bindable)
		selectedItems: HTMLElement[];
		items: StagePlotItem[];
		persons: { id: number; name: string; role?: string | null }[];
		title: string;
		lastModified: string;
		showZones: boolean;
		stageWidth: number;
		stageDepth: number;
		unit: UnitSystem;
		pdfPageFormat: 'letter' | 'a4';
		onPlaceRiser: (w: number, d: number, h: number) => void;
		onUpdateItem: (id: number, prop: string, val: string) => void;
		getItemZone: (item: StagePlotItem) => string;
		getItemPosition: (item: StagePlotItem) => { x: number; y: number };
		updateItemPosition: (id: number, x: number, y: number) => void;
		// People panel props
		bandPersons: { id: number; name: string; role: string | null; member_type: string | null }[];
		plotPersonIds: Set<number>;
		onAddPersonToPlot: (personId: number, silhouetteItem: ProcessedItem) => void;
		onCreatePerson: (name: string) => Promise<number>;
		onRemovePersonFromPlot: (personId: number) => void;
		// Settings panel props
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
		activeTab = $bindable(),
		selectedItems = $bindable(),
		items = $bindable(),
		persons,
		title = $bindable(),
		lastModified = $bindable(),
		showZones = $bindable(),
		stageWidth = $bindable(),
		stageDepth = $bindable(),
		unit = $bindable(),
		pdfPageFormat = $bindable(),
		onPlaceRiser,
		onUpdateItem,
		getItemZone,
		getItemPosition,
		updateItemPosition,
		bandPersons,
		plotPersonIds,
		onAddPersonToPlot,
		onCreatePerson,
		onRemovePersonFromPlot,
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
			<Inspector
				bind:selectedItems
				bind:items
				{persons}
				bind:title
				bind:lastModified
				bind:showZones
				bind:stageWidth
				bind:stageDepth
				bind:unit
				bind:pdfPageFormat
				{onPlaceRiser}
				{onUpdateItem}
				{getItemZone}
				{getItemPosition}
				{updateItemPosition}
			/>
		</div>
	{:else if activeTab === 'people'}
		<div class="min-h-0 flex-1 overflow-auto p-4">
			<PlotPeoplePanel
				{bandPersons}
				{plotPersonIds}
				{items}
				{onAddPersonToPlot}
				{onCreatePerson}
				{onRemovePersonFromPlot}
			/>
		</div>
	{:else}
		<div class="min-h-0 flex-1 overflow-auto p-4">
			<SettingsPanel
				{consoleType}
				{consoleDef}
				{consoleOptions}
				{categoryColorDefaults}
				{inputChannelMode}
				{outputChannelMode}
				{channelOptions}
				{outputOptions}
				{onConsoleTypeChange}
				{onCategoryColorDefaultsChange}
				{onInputChannelModeChange}
				{onOutputChannelModeChange}
			/>
		</div>
	{/if}
</div>
