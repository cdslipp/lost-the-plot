<script lang="ts">
	import Inspector from './Inspector.svelte';
	import MusicianPanel from './MusicianPanel.svelte';
	import SettingsPanel from './SettingsPanel.svelte';
	import type { UnitSystem } from '$lib/utils/scale';

	type Props = {
		activeTab: 'inspector' | 'musicians' | 'settings';
		// Inspector props (forwarded with $bindable)
		selectedItems: HTMLElement[];
		items: any[];
		musicians: any[];
		title: string;
		lastModified: string;
		showZones: boolean;
		stageWidth: number;
		stageDepth: number;
		unit: UnitSystem;
		pdfPageFormat: 'letter' | 'a4';
		onPlaceRiser: (w: number, d: number, h: number) => void;
		onUpdateItem: (id: number, prop: string, val: string) => void;
		onAddMusician: (name: string, instrument: string) => void;
		getItemZone: (item: any) => string;
		getItemPosition: (item: any) => { x: number; y: number };
		updateItemPosition: (id: number, x: number, y: number) => void;
		// Musician panel props
		bandPersons: { id: number; name: string; role: string | null; member_type: string | null }[];
		onImportFromBand: (persons: { name: string; role: string | null }[]) => void;
		onDeleteMusician: (id: number) => void;
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
		musicians = $bindable(),
		title = $bindable(),
		lastModified = $bindable(),
		showZones = $bindable(),
		stageWidth = $bindable(),
		stageDepth = $bindable(),
		unit = $bindable(),
		pdfPageFormat = $bindable(),
		onPlaceRiser,
		onUpdateItem,
		onAddMusician,
		getItemZone,
		getItemPosition,
		updateItemPosition,
		bandPersons,
		onImportFromBand,
		onDeleteMusician,
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

<div class="inspector-panel flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm">
	<div class="border-b border-border-primary bg-muted/30 px-3 pt-3">
		<div class="flex gap-1">
			<button
				type="button"
				onclick={() => (activeTab = 'inspector')}
				class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'inspector' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
			>
				Inspector
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'musicians')}
				class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'musicians' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
			>
				Musicians
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'settings')}
				class={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'settings' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
			>
				Settings
			</button>
		</div>
	</div>
	{#if activeTab === 'inspector'}
		<div class="flex-1 min-h-0 overflow-hidden p-4">
			<Inspector
				bind:selectedItems
				bind:items
				bind:musicians
				bind:title
				bind:lastModified
				bind:showZones
				bind:stageWidth
				bind:stageDepth
				bind:unit
				bind:pdfPageFormat
				{onPlaceRiser}
				onUpdateItem={onUpdateItem}
				onAddMusician={onAddMusician}
				{getItemZone}
				{getItemPosition}
				{updateItemPosition}
			/>
		</div>
	{:else if activeTab === 'musicians'}
		<div class="flex-1 min-h-0 overflow-auto p-4">
			<MusicianPanel
				{musicians}
				onAdd={onAddMusician}
				onDelete={onDeleteMusician}
				{bandPersons}
				{onImportFromBand}
			/>
		</div>
	{:else}
		<div class="flex-1 min-h-0 overflow-auto p-4">
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
