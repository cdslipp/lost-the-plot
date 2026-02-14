<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { generateId } from '@stageplotter/shared';
	import DetailPageLayout from '$lib/components/DetailPageLayout.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import BacklineList from '$lib/components/BacklineList.svelte';
	import FileDropzone from '$lib/components/FileDropzone.svelte';
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

	let festivalId = $derived($page.params.festivalId as string);
	let bandId = $derived($page.params.bandId as string);

	let band = $state<FestivalBandRow | null>(null);
	let files = $state<FestivalBandFileRow[]>([]);
	let allPlots = $state<PlotWithBand[]>([]);
	let loading = $state(true);
	let editingName = $state(false);
	let nameInput = $state('');
	let showDeleteConfirm = $state(false);

	const advanceStatuses: { value: AdvanceStatus; label: string }[] = [
		{ value: 'no_contact', label: 'No Contact' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'advanced', label: 'Advanced' }
	];

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
						class="w-full rounded-md border border-border-primary bg-transparent px-3 py-2 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
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
			<FileDropzone onfiles={handleFilesDropped} />
			{#if files.length > 0}
				<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each files as file (file.id)}
						<div
							class="flex items-center gap-2 rounded-lg border border-border-primary bg-surface px-3 py-2 shadow-sm"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4 flex-shrink-0 text-text-tertiary"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="min-w-0 flex-1 truncate text-sm text-text-primary">
								{file.original_filename}
							</span>
							<button
								onclick={() => handleDownloadFile(file)}
								class="flex-shrink-0 text-text-secondary hover:text-text-primary"
								title="Download"
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
							</button>
							<button
								onclick={() => handleDeleteFile(file.id)}
								class="flex-shrink-0 text-red-500 hover:text-red-700"
								title="Delete"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
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
			description="Delete "{band.name}"? This will remove all associated files and backline items. This cannot be undone."
			confirmLabel="Delete"
			variant="destructive"
			onconfirm={handleDeleteBand}
		/>
	{/if}
</DetailPageLayout>
