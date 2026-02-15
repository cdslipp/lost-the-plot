<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
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
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import EntityListPage from '$lib/components/EntityListPage.svelte';
	import type { BandWithPlotCount } from '$lib/db/repositories/bands';

	let exporting = $state(false);
	let importing = $state(false);
	let fileInput: HTMLInputElement;

	let notification = $state<{
		open: boolean;
		title: string;
		description: string;
		variant: 'success' | 'error';
	}>({ open: false, title: '', description: '', variant: 'success' });

	async function load(): Promise<BandWithPlotCount[]> {
		await db.init();
		return listBands();
	}

	async function create() {
		await db.init();
		const id = generateId();
		await createBandDb(id, 'Untitled Band');
		goto(`/bands/${id}?new=1`);
	}

	async function handleDelete(id: string) {
		await db.init();
		await deleteBandCascade(id);
	}

	async function handleRename(id: string, newName: string) {
		await db.init();
		await updateBandName(id, newName);
	}

	function deleteDescription(band: BandWithPlotCount): string {
		return `Delete "${band.name}"? This removes all plots, people, songs, gigs, and setlists.`;
	}

	async function handleDuplicateBand(bandId: string, closeMenu: () => void) {
		closeMenu();
		await db.init();
		await duplicateBand(bandId);
		window.location.reload();
	}

	async function handleExportBand(bandId: string, closeMenu: () => void) {
		closeMenu();
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
			notification = {
				open: true,
				title: 'Export Failed',
				description: 'Export failed. Please try again.',
				variant: 'error'
			};
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
			notification = {
				open: true,
				title: 'Import Successful',
				description: 'Bands imported successfully.',
				variant: 'success'
			};
			window.location.reload();
		} catch (error) {
			console.error('Import error:', error);
			notification = {
				open: true,
				title: 'Import Failed',
				description: 'Import failed. Please check the file format.',
				variant: 'error'
			};
		} finally {
			importing = false;
			target.value = '';
		}
	}
</script>

<EntityListPage
	title="Your Bands"
	entityName="Band"
	loadItems={load}
	onCreate={create}
	onDelete={handleDelete}
	onRename={handleRename}
	{deleteDescription}
>
	{#snippet cardContent(band)}
		<a href="/bands/{band.id}" class="flex-1">
			<h2 class="font-serif text-xl font-semibold text-text-primary group-hover:text-stone-600">
				{band.name}
			</h2>
			<div class="mt-2 flex items-center gap-4 text-sm text-text-secondary">
				<span>{band.plot_count} {band.plot_count === 1 ? 'plot' : 'plots'}</span>
				{#if band.created_at}
					<span>Created {new Date(band.created_at).toISOString().split('T')[0]}</span>
				{/if}
			</div>
		</a>
	{/snippet}

	{#snippet menuItems(band, closeMenu)}
		<button
			onclick={() => handleDuplicateBand(band.id, closeMenu)}
			class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
		>
			Duplicate
		</button>
		<button
			onclick={() => handleExportBand(band.id, closeMenu)}
			class="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
		>
			Export band
		</button>
	{/snippet}

	{#snippet footer()}
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
					disabled={importing}
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
					disabled={exporting}
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
				onclick={create}
				class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			>
				<PlusIcon />
				New Band
			</button>
		</div>
	{/snippet}
</EntityListPage>

<NotificationDialog
	bind:open={notification.open}
	title={notification.title}
	description={notification.description}
	variant={notification.variant}
/>
