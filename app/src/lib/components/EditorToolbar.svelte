<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { toggleMode } from 'mode-watcher';
	import { ImportExport } from '$lib';

	let exporting = $state(false);

	let {
		title = $bindable(''),
		revisionDate,
		showHelp = $bindable(false),
		onAddItem,
		onImportComplete,
		onTitleChange,
		onExportPdf,
		backHref,
		items = $bindable([]),
		musicians = $bindable([]),
		canvasWidth = $bindable(1100),
		canvasHeight = $bindable(850),
		lastModified = $bindable(''),
		getItemZone,
		getItemPosition
	}: {
		title: string;
		revisionDate: string;
		showHelp: boolean;
		onAddItem: () => void;
		onImportComplete: () => void;
		onTitleChange: () => void;
		onExportPdf?: () => Promise<void>;
		backHref?: string;
		items: any[];
		musicians: any[];
		canvasWidth: number;
		canvasHeight: number;
		lastModified: string;
		getItemZone: (item: any) => string;
		getItemPosition: (item: any) => { x: number; y: number };
	} = $props();

	async function handleExportPdf() {
		if (!onExportPdf || exporting) return;
		exporting = true;
		try {
			await onExportPdf();
		} finally {
			exporting = false;
		}
	}
</script>

<div class="mb-4 flex items-center justify-between gap-4">
	<div class="flex min-w-0 flex-1 items-center gap-3">
		{#if backHref}
			<a
				href={backHref}
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-primary text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
				aria-label="Back"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
				</svg>
			</a>
		{/if}
		<input
			bind:value={title}
			oninput={() => onTitleChange()}
			class="min-w-0 flex-1 border-b-2 border-dashed border-border-secondary bg-transparent px-2 py-1 font-serif text-3xl font-bold text-text-primary transition-all placeholder:font-normal placeholder:text-text-tertiary hover:border-border-primary focus:border-solid focus:border-stone-500 focus:outline-none"
			placeholder="Plot Name"
		/>
	</div>
	<div class="flex shrink-0 items-center gap-2">
		<div class="hidden text-sm text-text-secondary sm:block">
			{new Date(revisionDate).toLocaleDateString()}
		</div>
		<ImportExport
			bind:title
			bind:lastModified
			bind:items
			bind:musicians
			bind:canvasWidth
			bind:canvasHeight
			{getItemZone}
			{getItemPosition}
			{onImportComplete}
		/>
		{#if onExportPdf}
			<button
				onclick={handleExportPdf}
				disabled={exporting}
				class="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
				title="Export PDF"
			>
				{#if exporting}
					<div class="h-4 w-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"></div>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
					</svg>
				{/if}
			</button>
		{/if}
		<button
			onclick={() => (showHelp = !showHelp)}
			class="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
			title="Help"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
			</svg>
		</button>
		<button
			onclick={toggleMode}
			class="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
			title="Toggle dark mode"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 block dark:hidden" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
			</svg>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden dark:block" viewBox="0 0 20 20" fill="currentColor">
				<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
			</svg>
		</button>
		<button
			onclick={onAddItem}
			class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			title="Add Item (⌘K)"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
			</svg>
			Add Item
			<span class="rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-200 dark:bg-stone-300 dark:text-stone-800">⌘K</span>
		</button>
	</div>
</div>
