<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import { duplicateBand } from '$lib/utils/bandDuplication';
	import { exportBand, exportAllBands, handleImportFile } from '$lib/utils/bandImportExport';
	import {
		listBands,
		createBand as createBandDb,
		deleteBandCascade,
		updateBandName
	} from '$lib/db/repositories/bands';
	import { PlusIcon } from '$lib/components/icons';
	import type { BandWithPlotCount } from '$lib/db/repositories/bands';

	let bands = $state<BandWithPlotCount[]>([]);
	let loading = $state(true);
	let exporting = $state(false);
	let importing = $state(false);
	let openMenuBandId = $state<string | null>(null);
	let editingBandId = $state<string | null>(null);
	let bandNameInput = $state('');
	let fileInput: HTMLInputElement;

	async function loadBands() {
		await db.init();
		bands = await listBands();
		loading = false;
	}

	async function createBand() {
		await db.init();
		const id = generateId();
		await createBandDb(id, 'Untitled Band');
		goto(`/bands/${id}?new=1`);
	}

	async function handleDeleteBand(bandId: string, bandName: string) {
		openMenuBandId = null;
		const confirmed = confirm(
			`Delete "${bandName}"? This removes all plots, people, songs, gigs, and setlists.`
		);
		if (!confirmed) return;
		await db.init();
		await deleteBandCascade(bandId);
		await loadBands();
	}

	function startRenameBand(band: { id: string; name: string }) {
		editingBandId = band.id;
		bandNameInput = band.name;
		openMenuBandId = null;
	}

	function cancelRenameBand() {
		editingBandId = null;
		bandNameInput = '';
	}

	async function saveBandName(bandId: string) {
		const nextName = bandNameInput.trim();
		if (!nextName) return;
		await db.init();
		await updateBandName(bandId, nextName);
		editingBandId = null;
		bandNameInput = '';
		await loadBands();
	}

	async function handleDuplicateBand(bandId: string) {
		openMenuBandId = null;
		await db.init();
		await duplicateBand(bandId);
		await loadBands();
	}

	async function handleExportBand(bandId: string) {
		openMenuBandId = null;
		await db.init();
		await exportBand(bandId);
	}

	async function handleExportAllBands() {
		if (exporting) return;
		exporting = true;
		try {
			await db.init();
			await exportAllBands();
		} catch (error) {
			console.error('Failed to export bands:', error);
			alert('Export failed. Please try again.');
		} finally {
			exporting = false;
		}
	}

	function triggerImport() {
		fileInput?.click();
	}

	async function handleImport(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		importing = true;
		try {
			await handleImportFile(file);
			await loadBands();
			alert('Bands imported successfully.');
		} catch (error) {
			console.error('Import error:', error);
			alert('Import failed. Please check the file format.');
		} finally {
			importing = false;
			target.value = '';
		}
	}

	onMount(() => {
		loadBands();
	});
</script>

<svelte:head>
	<title>Bands | Lost the Plot</title>
</svelte:head>

<svelte:window
	onclick={() => (openMenuBandId = null)}
	onkeydown={(event) => {
		if ((event as KeyboardEvent).key === 'Escape') {
			openMenuBandId = null;
			cancelRenameBand();
		}
	}}
/>

<div class="mx-auto flex h-[calc(100dvh-1.25rem)] max-w-md flex-col gap-6 py-6">
	<div class="flex items-center justify-between">
		<h1 class="font-serif text-3xl font-bold text-text-primary">Your Bands</h1>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<p class="text-text-secondary">Loading...</p>
		</div>
	{:else if bands.length === 0}
		<div class="flex flex-1 items-center justify-center">
			<div class="rounded-xl border border-border-primary bg-surface p-8 text-center shadow-sm">
				<p class="text-lg text-text-secondary">Create your first band to get started</p>
				<button
					onclick={createBand}
					class="mt-4 rounded-lg bg-stone-900 px-6 py-3 text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Create Band
				</button>
			</div>
		</div>
	{:else}
		<div class="band-list-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
			{#each bands as band (band.id)}
				<div
					class="group relative flex items-start justify-between gap-3 rounded-xl border border-border-primary bg-surface p-6 shadow-sm transition hover:border-stone-400 hover:shadow-md"
				>
					{#if editingBandId === band.id}
						<form
							onsubmit={(event) => {
								event.preventDefault();
								saveBandName(band.id);
							}}
							class="flex flex-1 items-center gap-2"
						>
							<input
								bind:value={bandNameInput}
								class="w-full border-b border-dashed border-border-secondary bg-transparent px-1 py-1 font-serif text-xl font-semibold text-text-primary focus:border-stone-500 focus:outline-none"
								autofocus
							/>
							<button
								type="submit"
								class="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
							>
								Save
							</button>
							<button
								type="button"
								onclick={cancelRenameBand}
								class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
							>
								Cancel
							</button>
						</form>
					{:else}
						<a href="/bands/{band.id}" class="flex-1">
							<h2
								class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600"
							>
								{band.name}
							</h2>
							<div class="mt-2 flex items-center gap-4 text-sm text-text-secondary">
								<span>{band.plot_count} {band.plot_count === 1 ? 'plot' : 'plots'}</span>
								{#if band.created_at}
									<span>Created {new Date(band.created_at).toISOString().split('T')[0]}</span>
								{/if}
							</div>
						</a>
						<button
							onclick={(event) => {
								event.stopPropagation();
								openMenuBandId = openMenuBandId === band.id ? null : band.id;
							}}
							class="rounded p-1.5 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-surface-hover hover:text-text-primary"
							aria-label="Open band menu"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</button>
						{#if openMenuBandId === band.id}
							<div
								onclick={(event) => event.stopPropagation()}
								class="absolute top-12 right-4 z-10 w-44 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
							>
								<button
									onclick={() => handleDuplicateBand(band.id)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Duplicate
								</button>
								<button
									onclick={() => handleExportBand(band.id)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Export band
								</button>
								<button
									onclick={() => startRenameBand(band)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
								>
									Rename band
								</button>
								<button
									onclick={() => handleDeleteBand(band.id, band.name)}
									class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									Delete band
								</button>
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div
		class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/40"
	>
		<p class="text-center text-sm text-blue-800 dark:text-blue-300">
			We do not run a cloud service. Your data is stored on THIS device alone. If you want to move
			to another device, export your data here.
			<a
				href="https://plot.slipp.cam/how-it-works"
				target="_blank"
				rel="noopener noreferrer"
				class="underline hover:text-blue-600 dark:hover:text-blue-200">Learn more</a
			>
		</p>
	</div>

	<div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
		<input
			bind:this={fileInput}
			type="file"
			accept=".json"
			onchange={handleImport}
			style="display: none"
		/>
		<div class="flex flex-wrap items-center gap-2">
			<button
				onclick={triggerImport}
				disabled={loading || importing}
				class="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
				title="Import bands and plots"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				{importing ? 'Importing...' : 'Import'}
			</button>
			<button
				onclick={handleExportAllBands}
				disabled={loading || bands.length === 0 || exporting}
				class="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-2 text-sm text-text-primary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
				title="Export all bands and plots"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
				{exporting ? 'Exporting...' : 'Export All'}
			</button>
		</div>
		<button
			onclick={createBand}
			class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
		>
			<PlusIcon />
			New Band
		</button>
	</div>
</div>

<style>
	/* Slim scrollbar */
	.band-list-scroll {
		scrollbar-width: thin;
		scrollbar-color: rgb(168 162 158 / 0.4) transparent;
	}
	.band-list-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.band-list-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.band-list-scroll::-webkit-scrollbar-thumb {
		background: rgb(168 162 158 / 0.4);
		border-radius: 3px;
	}
	.band-list-scroll::-webkit-scrollbar-thumb:hover {
		background: rgb(168 162 158 / 0.6);
	}

	/* Feathered fade at bottom edge */
	.band-list-scroll {
		mask-image: linear-gradient(to bottom, black 0%, black calc(100% - 32px), transparent 100%);
		-webkit-mask-image: linear-gradient(
			to bottom,
			black 0%,
			black calc(100% - 32px),
			transparent 100%
		);
	}
</style>
