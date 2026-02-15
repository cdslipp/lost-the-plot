<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { generateId } from '@stageplotter/shared';
	import DetailPageLayout from '$lib/components/DetailPageLayout.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import BacklineList from '$lib/components/BacklineList.svelte';
	import FileDropzone from '$lib/components/FileDropzone.svelte';
	import FileThumbnail from '$lib/components/FileThumbnail.svelte';
	import FileLightbox from '$lib/components/FileLightbox.svelte';
	import {
		getFestivalBandById,
		updateFestivalBand,
		deleteFestivalBand,
		type FestivalBandRow,
		type AdvanceStatus
	} from '$lib/db/repositories/festivalBands';
	import {
		listBandFiles,
		createBandFile,
		deleteBandFile,
		type FestivalBandFileRow
	} from '$lib/db/repositories/festivalBandFiles';
	import { getAllPlotsWithBandName, type PlotWithBand } from '$lib/db/repositories/plots';
	import { saveFile } from '$lib/utils/opfsStorage';
	import { downloadOpfsFile } from '$lib/utils/downloadFile';
	import { APP_NAME } from '$lib/config';

	let festivalId = $derived($page.params.festivalId as string);
	let bandId = $derived($page.params.bandId as string);

	let band = $state<FestivalBandRow | null>(null);
	let files = $state<FestivalBandFileRow[]>([]);
	let allPlots = $state<PlotWithBand[]>([]);
	let loading = $state(true);
	let editingName = $state(false);
	let nameInput = $state('');
	let showDeleteConfirm = $state(false);
	let previewFile = $state<FestivalBandFileRow | null>(null);

	const advanceStatuses: { value: AdvanceStatus; label: string }[] = [
		{ value: 'no_contact', label: 'No Contact' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'advanced', label: 'Advanced' }
	];

	const advanceStatusColors: Record<AdvanceStatus, string> = {
		no_contact: 'text-red-500 border-red-500/50',
		in_progress: 'text-yellow-500 border-yellow-500/50',
		advanced: 'text-green-500 border-green-500/50'
	};

	async function load() {
		const row = await getFestivalBandById(bandId);
		if (!row) {
			goto(`/festivals/${festivalId}`, { replaceState: true });
			return;
		}
		band = row;
		nameInput = row.name;
		files = await listBandFiles(bandId);
		allPlots = await getAllPlotsWithBandName();
		loading = false;
	}

	async function saveName() {
		if (!nameInput.trim() || !band) return;
		await updateFestivalBand(bandId, { name: nameInput.trim() });
		band.name = nameInput.trim();
		editingName = false;
	}

	async function handleFieldBlur(field: string, value: string | number | null) {
		await updateFestivalBand(bandId, {
			[field]: typeof value === 'number' ? value : value || null
		});
		band = await getFestivalBandById(bandId);
	}

	async function handlePlotSelect(plotId: string) {
		await updateFestivalBand(bandId, { plot_id: plotId || null });
		band = await getFestivalBandById(bandId);
	}

	async function handleFilesDropped(droppedFiles: File[]) {
		for (const file of droppedFiles) {
			const buffer = await file.arrayBuffer();
			const fileId = generateId();
			const path = `${bandId}/${fileId}-${file.name}`;
			await saveFile(path, buffer);
			await createBandFile(fileId, bandId, path, file.name, file.type || null);
		}
		files = await listBandFiles(bandId);
	}

	async function handleDeleteFile(fileId: string) {
		await deleteBandFile(fileId);
		files = await listBandFiles(bandId);
	}

	async function handleDownloadFile(file: FestivalBandFileRow) {
		await downloadOpfsFile(file.file_path, file.original_filename, file.file_type ?? undefined);
	}

	async function handleDeleteBand() {
		await deleteFestivalBand(bandId);
		goto(`/festivals/${festivalId}`, { replaceState: true });
	}

	onMount(() => {
		load();
	});
</script>

<svelte:head>
	<title>{band?.name ?? 'Band'} | {APP_NAME}</title>
</svelte:head>

<DetailPageLayout
	backHref="/festivals/{festivalId}"
	backLabel="Back to festival"
	name={band?.name || ''}
	bind:editing={editingName}
	bind:nameInput
	{loading}
	onsave={saveName}
	oncancel={() => {
		editingName = false;
		nameInput = band?.name || '';
	}}
	onedit={() => (editingName = true)}
>
	{#if band}
		<!-- Info Section -->
		<div>
			<h2 class="mb-3 font-serif text-xl font-semibold text-text-primary">Info</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- Website -->
				<div>
					<label for="website" class="mb-1 block text-sm text-text-secondary">Website</label>
					<input
						id="website"
						type="url"
						value={band.website ?? ''}
						placeholder="https://..."
						onblur={(e) => handleFieldBlur('website', (e.target as HTMLInputElement).value)}
						class="w-full rounded-md border border-border-primary bg-transparent px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
					/>
				</div>

				<!-- Advance Status -->
				<div>
					<label for="advance-status" class="mb-1 block text-sm text-text-secondary"
						>Advance Status</label
					>
					<select
						id="advance-status"
						value={band.advance_status}
						onchange={(e) =>
							handleFieldBlur('advance_status', (e.target as HTMLSelectElement).value)}
						class="w-full rounded-md border bg-transparent px-3 py-2 text-sm font-medium focus:outline-none {advanceStatusColors[
							band.advance_status ?? 'no_contact'
						]}"
					>
						{#each advanceStatuses as status (status.value)}
							<option value={status.value}>{status.label}</option>
						{/each}
					</select>
				</div>

				<!-- Headliner -->
				<div class="flex items-center">
					<label class="flex items-center gap-2 text-sm text-text-primary">
						<input
							type="checkbox"
							checked={band.is_headliner === 1}
							onchange={(e) =>
								handleFieldBlur('is_headliner', (e.target as HTMLInputElement).checked ? 1 : 0)}
							class="rounded border-border-primary"
						/>
						Headliner
					</label>
				</div>
			</div>

			<!-- Notes -->
			<div class="mt-4">
				<label for="notes" class="mb-1 block text-sm text-text-secondary">Notes</label>
				<textarea
					id="notes"
					value={band.notes ?? ''}
					onblur={(e) => handleFieldBlur('notes', (e.target as HTMLTextAreaElement).value)}
					rows="3"
					class="w-full rounded-md border border-border-primary bg-transparent px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
				></textarea>
			</div>
		</div>

		<hr class="border-border-primary" />

		<!-- Stage Plot Section -->
		<div>
			<h2 class="mb-3 font-serif text-xl font-semibold text-text-primary">Stage Plot</h2>
			<div class="flex flex-col gap-3">
				<div>
					<label for="plot-url" class="mb-1 block text-sm text-text-secondary">Plot URL</label>
					<input
						id="plot-url"
						type="url"
						value={band.plot_url ?? ''}
						placeholder="Paste plot URL"
						onblur={(e) => handleFieldBlur('plot_url', (e.target as HTMLInputElement).value)}
						class="w-full rounded-md border border-border-primary bg-transparent px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
					/>
				</div>
				<div>
					<label for="plot-picker" class="mb-1 block text-sm text-text-secondary"
						>Pick Existing Plot</label
					>
					<select
						id="plot-picker"
						value={band.plot_id ?? ''}
						onchange={(e) => handlePlotSelect((e.target as HTMLSelectElement).value)}
						class="w-full rounded-md border border-border-primary bg-transparent px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
					>
						<option value="">None</option>
						{#each allPlots as plot (plot.id)}
							<option value={plot.id}>{plot.band_name} — {plot.name}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<hr class="border-border-primary" />

		<!-- Files Section -->
		<div>
			<h2 class="mb-3 font-serif text-xl font-semibold text-text-primary">Files</h2>
			<FileDropzone onfiles={handleFilesDropped}>
				{#if files.length > 0}
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
						{#each files as file (file.id)}
							<FileThumbnail
								{file}
								onclick={() => (previewFile = file)}
								ondownload={() => handleDownloadFile(file)}
								ondelete={() => handleDeleteFile(file.id)}
							/>
						{/each}
					</div>
				{/if}
			</FileDropzone>
		</div>

		<hr class="border-border-primary" />

		<!-- Backline Section -->
		<div>
			<h2 class="mb-3 font-serif text-xl font-semibold text-text-primary">Backline</h2>
			<BacklineList festivalBandId={bandId} />
		</div>

		<hr class="border-border-primary" />

		<!-- Danger Zone -->
		<div>
			<h2 class="mb-3 font-serif text-xl font-semibold text-red-600 dark:text-red-400">
				Danger Zone
			</h2>
			<button
				onclick={() => (showDeleteConfirm = true)}
				class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
			>
				Delete Band
			</button>
		</div>

		<ConfirmDialog
			bind:open={showDeleteConfirm}
			title="Delete Band"
			description={`Delete "${band.name}"? This will remove all associated files and backline items. This cannot be undone.`}
			confirmLabel="Delete"
			variant="destructive"
			onconfirm={handleDeleteBand}
		/>
	{/if}
</DetailPageLayout>

<FileLightbox
	file={previewFile}
	{files}
	onclose={() => (previewFile = null)}
	onnavigate={(f) => (previewFile = f)}
	ondownload={handleDownloadFile}
/>
