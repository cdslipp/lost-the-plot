<script lang="ts">
	import { generateId } from '@stageplotter/shared';
	import {
		listFestivalBands,
		createFestivalBand,
		updateFestivalBand,
		deleteFestivalBand,
		type FestivalBandRow
	} from '$lib/db/repositories/festivalBands';
	import { getAllPlotsWithBandName, type PlotWithBand } from '$lib/db/repositories/plots';
	import { saveFile, deleteFile } from '$lib/utils/opfsStorage';
	import SaveButton from '$lib/components/SaveButton.svelte';
	import BacklineList from '$lib/components/BacklineList.svelte';

	type Props = {
		festivalId: string;
		onbandschanged?: () => void;
	};

	let { festivalId, onbandschanged }: Props = $props();

	let bands = $state<FestivalBandRow[]>([]);
	let expandedBandId = $state<string | null>(null);
	let allPlots = $state<PlotWithBand[]>([]);
	let newBandName = $state('');
	let bandNameInputEl = $state<HTMLInputElement | null>(null);

	export async function reload() {
		bands = await listFestivalBands(festivalId);
		onbandschanged?.();
	}

	async function loadPlots() {
		if (allPlots.length === 0) {
			allPlots = await getAllPlotsWithBandName();
		}
	}

	async function handleAddBand() {
		if (!newBandName.trim()) return;
		const id = generateId();
		await createFestivalBand(id, festivalId, newBandName.trim());
		newBandName = '';
		await reload();
		expandedBandId = id;
	}

	async function handleFieldBlur(bandId: string, field: string, value: string | number | null) {
		await updateFestivalBand(bandId, {
			[field]: typeof value === 'number' ? value : value || null
		});
		await reload();
	}

	function handleEditorKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			const target = e.target as HTMLElement;
			if (target.tagName === 'TEXTAREA') return;
			e.preventDefault();
			expandedBandId = null;
		}
	}

	async function handlePlotSelect(bandId: string, plotId: string) {
		if (plotId === '') {
			await updateFestivalBand(bandId, { plot_id: null });
		} else {
			await updateFestivalBand(bandId, { plot_id: plotId });
		}
		await reload();
	}

	async function handleFileUpload(bandId: string, event: Event, fileType: 'pdf' | 'json') {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const buffer = await file.arrayBuffer();
		const path = `${bandId}/${file.name}`;
		await saveFile(path, buffer);
		await updateFestivalBand(bandId, {
			file_path: path,
			file_type: fileType,
			original_filename: file.name
		});
		await reload();
		target.value = '';
	}

	async function handleRemoveFile(bandId: string, filePath: string) {
		await deleteFile(filePath);
		await updateFestivalBand(bandId, {
			file_path: null,
			file_type: null,
			original_filename: null
		});
		await reload();
	}

	async function handleDeleteBand(bandId: string) {
		await deleteFestivalBand(bandId);
		if (expandedBandId === bandId) expandedBandId = null;
		await reload();
	}

	function toggleExpand(bandId: string) {
		expandedBandId = expandedBandId === bandId ? null : bandId;
		if (expandedBandId === bandId) loadPlots();
	}

	$effect(() => {
		if (festivalId) reload();
	});
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-xs font-semibold tracking-wide text-text-tertiary uppercase">Bands</h3>

	{#each bands as band (band.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="group rounded-lg border border-border-primary bg-surface shadow-sm transition hover:border-stone-400"
			draggable={expandedBandId !== band.id}
			ondragstart={(e) => {
				e.dataTransfer?.setData(
					'application/x-festival-band',
					JSON.stringify({ id: band.id, name: band.name })
				);
				if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
			}}
		>
			<!-- Collapsed row -->
			<button
				onclick={() => toggleExpand(band.id)}
				class="flex w-full items-center gap-2 px-3 py-2 text-left {expandedBandId !== band.id
					? 'cursor-grab active:cursor-grabbing'
					: ''}"
			>
				<span class="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
					{band.name}
					{#if band.is_headliner === 1}
						<span class="text-amber-500" title="Headliner">★</span>
					{/if}
				</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5 flex-shrink-0 text-text-tertiary transition {expandedBandId === band.id
						? 'rotate-180'
						: ''}"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>

			<!-- Expanded editor -->
			{#if expandedBandId === band.id}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="border-t border-border-primary px-3 py-3" onkeydown={handleEditorKeydown}>
					<div class="flex flex-col gap-2.5">
						<!-- Name -->
						<div>
							<label class="mb-0.5 block text-xs text-text-secondary">Name</label>
							<input
								type="text"
								value={band.name}
								onblur={(e) =>
									handleFieldBlur(band.id, 'name', (e.target as HTMLInputElement).value)}
								class="w-full rounded-md border border-border-primary bg-transparent px-2 py-1 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							/>
						</div>

						<!-- Headliner -->
						<label class="flex items-center gap-2 text-sm text-text-primary">
							<input
								type="checkbox"
								checked={band.is_headliner === 1}
								onchange={(e) =>
									handleFieldBlur(
										band.id,
										'is_headliner',
										(e.target as HTMLInputElement).checked ? 1 : 0
									)}
								class="rounded border-border-primary"
							/>
							Headliner
						</label>

						<!-- Website -->
						<div>
							<label class="mb-0.5 block text-xs text-text-secondary">Website</label>
							<input
								type="url"
								value={band.website ?? ''}
								placeholder="https://..."
								onblur={(e) =>
									handleFieldBlur(band.id, 'website', (e.target as HTMLInputElement).value)}
								class="w-full rounded-md border border-border-primary bg-transparent px-2 py-1 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							/>
						</div>

						<!-- Notes -->
						<div>
							<label class="mb-0.5 block text-xs text-text-secondary">Notes</label>
							<textarea
								value={band.notes ?? ''}
								onblur={(e) =>
									handleFieldBlur(band.id, 'notes', (e.target as HTMLTextAreaElement).value)}
								rows="2"
								class="w-full rounded-md border border-border-primary bg-transparent px-2 py-1 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							></textarea>
						</div>

						<!-- Plot section -->
						<div>
							<label class="mb-0.5 block text-xs text-text-secondary">Stage Plot</label>
							<div class="flex flex-col gap-1.5">
								<!-- Paste URL -->
								<input
									type="url"
									value={band.plot_url ?? ''}
									placeholder="Paste plot URL"
									onblur={(e) =>
										handleFieldBlur(band.id, 'plot_url', (e.target as HTMLInputElement).value)}
									class="w-full rounded-md border border-border-primary bg-transparent px-2 py-1 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
								/>

								<!-- Pick from existing plots -->
								<select
									value={band.plot_id ?? ''}
									onchange={(e) => handlePlotSelect(band.id, (e.target as HTMLSelectElement).value)}
									class="w-full rounded-md border border-border-primary bg-transparent px-2 py-1 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
								>
									<option value="">Pick existing plot...</option>
									{#each allPlots as plot (plot.id)}
										<option value={plot.id}>{plot.band_name} — {plot.name}</option>
									{/each}
								</select>

								<!-- File upload -->
								{#if band.file_path}
									<div
										class="flex items-center gap-2 rounded-md bg-stone-100 px-2 py-1 text-xs dark:bg-stone-800"
									>
										<span class="min-w-0 flex-1 truncate text-text-secondary">
											{band.original_filename}
										</span>
										<button
											onclick={() => handleRemoveFile(band.id, band.file_path!)}
											class="flex-shrink-0 text-red-500 hover:text-red-700"
										>
											Remove
										</button>
									</div>
								{:else}
									<div class="flex gap-1.5">
										<label
											class="flex flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed border-border-primary px-2 py-1 text-xs text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
										>
											Upload JSON
											<input
												type="file"
												accept=".json"
												onchange={(e) => handleFileUpload(band.id, e, 'json')}
												class="hidden"
											/>
										</label>
										<label
											class="flex flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed border-border-primary px-2 py-1 text-xs text-text-secondary transition hover:border-stone-400 hover:text-text-primary"
										>
											Upload PDF
											<input
												type="file"
												accept=".pdf"
												onchange={(e) => handleFileUpload(band.id, e, 'pdf')}
												class="hidden"
											/>
										</label>
									</div>
								{/if}
							</div>
						</div>

						<!-- Backline -->
						<BacklineList festivalBandId={band.id} />

						<!-- Actions -->
						<div class="mt-1 flex items-center gap-2">
							<button
								onclick={() => handleDeleteBand(band.id)}
								class="self-start rounded-md px-2 py-1 text-xs text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
							>
								Delete band
							</button>
							<div class="flex-1"></div>
							<SaveButton onclick={() => (expandedBandId = null)} />
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<!-- Always-visible inline add row -->
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleAddBand();
		}}
		class="rounded-lg border border-dashed border-border-primary bg-surface shadow-sm"
	>
		<button type="submit" class="hidden"></button>
		<div class="flex items-center gap-2 px-3 py-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-3.5 w-3.5 shrink-0 text-text-tertiary"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<input
				bind:this={bandNameInputEl}
				bind:value={newBandName}
				placeholder="Band name"
				class="min-w-0 flex-1 rounded-md border border-border-primary bg-surface px-2 py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						newBandName = '';
						(e.target as HTMLElement)?.blur();
					}
				}}
			/>
			{#if newBandName.trim()}
				<span class="shrink-0 text-xs text-text-tertiary">&#x21B5; to add</span>
			{/if}
		</div>
	</form>
</div>
