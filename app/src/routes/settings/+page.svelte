<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { APP_NAME } from '$lib/config';
	import ListPageLayout from '$lib/components/ListPageLayout.svelte';
	import { AlertDialog, Switch } from 'bits-ui';
	import { mode, setMode } from 'mode-watcher';
	import { onMount } from 'svelte';
	import { db } from '$lib/db';
	import { preferences } from '$lib/state/preferences.svelte';

	let dbSizeBytes = $state<number | null>(null);
	let deleteDialogOpen = $state(false);
	let deleteConfirmText = $state('');
	let deleting = $state(false);

	const deleteEnabled = $derived(deleteConfirmText.trim().toLowerCase() === 'lost the plot');

	onMount(async () => {
		const result = await db.queryOne<{ size: number }>(
			'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
		);
		if (result) dbSizeBytes = result.size;
	});

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function handleDeleteAllData() {
		deleting = true;
		try {
			await db.exec(`
				DELETE FROM festival_band_backline;
				DELETE FROM festival_slots;
				DELETE FROM festival_days;
				DELETE FROM festival_bands;
				DELETE FROM festivals;
				DELETE FROM setlist_songs;
				DELETE FROM setlists;
				DELETE FROM gigs;
				DELETE FROM plot_persons;
				DELETE FROM items;
				DELETE FROM musicians;
				DELETE FROM songs;
				DELETE FROM persons;
				DELETE FROM gear_items;
				DELETE FROM stage_plots;
				DELETE FROM bands;
			`);
			window.location.href = '/';
		} catch (e) {
			console.error('Failed to delete all data:', e);
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Settings | {APP_NAME}</title>
</svelte:head>

<ListPageLayout title="Settings">
	<div class="flex flex-col gap-6">
		<!-- Appearance -->
		<section>
			<h2 class="mb-3 font-serif text-lg font-semibold text-text-primary">Appearance</h2>
			<div class="rounded-xl border border-border-primary bg-surface p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-text-primary">Dark mode</p>
						<p class="text-xs text-text-tertiary">Switch between light and dark themes</p>
					</div>
					<Switch.Root
						checked={mode.current === 'dark'}
						onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-stone-300 transition-colors data-[state=checked]:bg-stone-700 dark:bg-stone-600 dark:data-[state=checked]:bg-stone-400"
					>
						<Switch.Thumb
							class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
						/>
					</Switch.Root>
				</div>
			</div>
		</section>

		<!-- Time Format -->
		<section>
			<h2 class="mb-3 font-serif text-lg font-semibold text-text-primary">Time Format</h2>
			<div class="rounded-xl border border-border-primary bg-surface p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-text-primary">24-hour time</p>
						<p class="text-xs text-text-tertiary">
							{#if preferences.use24h}
								Showing times as 14:30
							{:else}
								Showing times as 2:30 PM
							{/if}
						</p>
					</div>
					<Switch.Root
						checked={preferences.use24h}
						onCheckedChange={(checked) => {
							preferences.timeFormat = checked ? '24h' : '12h';
						}}
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-stone-300 transition-colors data-[state=checked]:bg-stone-700 dark:bg-stone-600 dark:data-[state=checked]:bg-stone-400"
					>
						<Switch.Thumb
							class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
						/>
					</Switch.Root>
				</div>
			</div>
		</section>

		<!-- Data -->
		<section>
			<h2 class="mb-3 font-serif text-lg font-semibold text-text-primary">Data</h2>
			<div class="flex flex-col gap-3">
				<div class="rounded-xl border border-border-primary bg-surface p-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-text-primary">Database size</p>
							<p class="text-xs text-text-tertiary">Storage used by your local data</p>
						</div>
						<p class="text-sm font-medium text-text-primary">
							{#if dbSizeBytes !== null}
								{formatBytes(dbSizeBytes)}
							{:else}
								&hellip;
							{/if}
						</p>
					</div>
				</div>
				<div class="rounded-xl border border-red-200 bg-surface p-4 dark:border-red-900/50">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-text-primary">Delete all data</p>
							<p class="text-xs text-text-tertiary">
								Permanently remove all bands, plots, and other data
							</p>
						</div>
						<button
							onclick={() => (deleteDialogOpen = true)}
							class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
						>
							Delete
						</button>
					</div>
				</div>
			</div>
		</section>
	</div>
</ListPageLayout>

<AlertDialog.Root bind:open={deleteDialogOpen} onOpenChange={() => (deleteConfirmText = '')}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
		<AlertDialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-primary bg-surface p-6 shadow-xl"
		>
			<AlertDialog.Title class="font-serif text-xl font-semibold text-text-primary">
				Delete all data
			</AlertDialog.Title>
			<AlertDialog.Description class="mt-2 text-sm text-text-secondary">
				This will permanently delete all your bands, stage plots, festivals, gigs, and setlists.
				This cannot be undone.
			</AlertDialog.Description>
			<input
				type="text"
				bind:value={deleteConfirmText}
				placeholder={'Type "lost the plot" to confirm'}
				class="mt-4 w-full rounded-lg border border-border-primary bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
			/>
			<div class="mt-6 flex justify-end gap-3">
				<AlertDialog.Cancel
					class="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-hover"
				>
					Cancel
					<kbd
						class="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary dark:bg-stone-700"
						>Esc</kbd
					>
				</AlertDialog.Cancel>
				<button
					disabled={!deleteEnabled || deleting}
					onclick={handleDeleteAllData}
					class="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition {deleteEnabled
						? 'bg-red-600 hover:bg-red-700'
						: 'cursor-not-allowed bg-red-600/40'}"
				>
					{deleting ? 'Deleting...' : 'Delete everything'}
				</button>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
