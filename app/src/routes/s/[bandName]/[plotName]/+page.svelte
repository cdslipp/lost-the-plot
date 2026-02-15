<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { decodePayload, type DecodedPlot } from '@stageplotter/shared/share-codec';
	import StageDeck from '$lib/components/StageDeck.svelte';
	import CanvasOverlay from '$lib/components/CanvasOverlay.svelte';
	import { db } from '$lib/db';
	import { runInTransaction } from '$lib/db/batch';
	import { insertPersonsForBand } from '$lib/db/repositories/persons';
	import { exportToPdf } from '$lib/utils/pdf';
	import { getCurrentImageSrc } from '$lib/utils/canvasUtils';
	import { APP_NAME } from '$lib/config';

	const MARKETING_URL = 'https://plot.slipp.cam';
	const APP_URL = 'https://ltp.slipp.cam';

	let bandName = $derived(
		decodeURIComponent(($page.params as Record<string, string>).bandName ?? '')
	);
	let plotName = $derived(
		decodeURIComponent(($page.params as Record<string, string>).plotName ?? '')
	);

	let plot = $state<DecodedPlot | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let importing = $state(false);
	let importSuccess = $state(false);
	let copied = $state(false);
	let exportingPdf = $state(false);

	// Contain-fit canvas sizing
	let canvasWrapperEl = $state<HTMLElement | null>(null);
	let canvasEl = $state<HTMLElement | null>(null);
	let canvasPixelWidth = $state(800);
	let canvasPixelHeight = $state(533);
	let pxPerFoot = $derived(plot ? canvasPixelWidth / plot.stageWidth : 1);
	let inputItems = $derived(
		plot
			? plot.items
					.filter((i) => i.channel && parseInt(i.channel) > 0)
					.sort((a, b) => parseInt(a.channel) - parseInt(b.channel))
			: []
	);

	// ResizeObserver for contain-fit
	$effect(() => {
		if (!browser || !canvasWrapperEl || !plot) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const availW = entry.contentRect.width;
				const availH = entry.contentRect.height;
				if (!availW || !availH || !plot) return;
				const stageAspect = plot.stageWidth / plot.stageDepth;
				if (availW / availH > stageAspect) {
					canvasPixelHeight = availH;
					canvasPixelWidth = Math.round(availH * stageAspect);
				} else {
					canvasPixelWidth = availW;
					canvasPixelHeight = Math.round(availW / stageAspect);
				}
			}
		});
		ro.observe(canvasWrapperEl);
		// Initial size
		const rect = canvasWrapperEl.getBoundingClientRect();
		if (rect.width && rect.height && plot) {
			const stageAspect = plot.stageWidth / plot.stageDepth;
			if (rect.width / rect.height > stageAspect) {
				canvasPixelHeight = rect.height;
				canvasPixelWidth = Math.round(rect.height * stageAspect);
			} else {
				canvasPixelWidth = rect.width;
				canvasPixelHeight = Math.round(rect.width / stageAspect);
			}
		}
		return () => ro.disconnect();
	});

	onMount(async () => {
		if (!browser) return;

		const hash = window.location.hash.slice(1); // strip the '#'
		if (!hash) {
			error = 'No stage plot data found in this link.';
			loading = false;
			return;
		}

		try {
			// Load the catalog for item reconstruction
			const resp = await fetch('/final_assets/items.json');
			if (!resp.ok) throw new Error('Failed to load asset catalog');
			const catalog = await resp.json();

			plot = await decodePayload(hash, catalog);
		} catch (e) {
			console.error('Failed to decode shared plot:', e);
			error = 'This share link appears to be invalid or corrupted.';
		} finally {
			loading = false;
		}
	});

	async function handleImport() {
		if (!plot || importing) return;
		const currentPlot = plot;
		importing = true;

		try {
			await db.init();

			const nowIso = new Date().toISOString();
			const today = nowIso.split('T')[0];
			let plotId = '';
			const bandId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
			await runInTransaction(async () => {
				// Create a new band
				await db.run('INSERT INTO bands (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
					bandId,
					bandName,
					nowIso,
					nowIso
				]);

				// Import persons
				await insertPersonsForBand(
					bandId,
					currentPlot.persons.map((person) => ({
						name: person.name,
						role: person.role || null,
						pronouns: person.pronouns || null,
						phone: person.phone || null,
						email: person.email || null,
						member_type: person.member_type,
						status: person.status
					}))
				);

				// Create the stage plot (items are already in feet from decoder)
				plotId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
				const metadata = JSON.stringify({
					coordVersion: 2,
					items: currentPlot.items,
					musicians: currentPlot.musicians,
					undoLog: [],
					redoStack: []
				});

				await db.run(
					`INSERT INTO stage_plots (id, name, revision_date, canvas_width, canvas_height, metadata, band_id, stage_width, stage_depth)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					[
						plotId,
						plotName,
						today,
						1100,
						Math.round((1100 * currentPlot.stageDepth) / currentPlot.stageWidth),
						metadata,
						bandId,
						currentPlot.stageWidth,
						currentPlot.stageDepth
					]
				);
			});

			importSuccess = true;

			// Navigate to the imported plot after a brief delay
			setTimeout(() => {
				goto(`/bands/${bandId}/plots/${plotId}`);
			}, 1500);
		} catch (e) {
			console.error('Import failed:', e);
			error = 'Failed to import the stage plot. Please try again.';
		} finally {
			importing = false;
		}
	}

	function copyLink() {
		navigator.clipboard.writeText(window.location.href);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function handleExportPdf() {
		if (!canvasEl || !plot || exportingPdf) return;
		exportingPdf = true;
		try {
			await exportToPdf({
				plotName,
				canvasEl,
				items: plot.items.map((i) => ({
					name: i.name || i.itemData?.name || '',
					channel: i.channel || '',
					person_name: i.musician || ''
				})),
				persons: plot.musicians.map((m) => ({
					name: m.name,
					role: m.instrument || ''
				}))
			});
		} finally {
			exportingPdf = false;
		}
	}
</script>

<svelte:head>
	<title>{plotName} - {bandName} | {APP_NAME}</title>
</svelte:head>

<div class="flex h-[calc(100dvh-4.25rem)] flex-col gap-3 overflow-hidden py-3">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
				></div>
				<p class="text-text-secondary">Loading stage plot...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div class="mb-4 text-4xl">!</div>
				<h2 class="mb-2 text-xl font-bold text-text-primary">Unable to Load Plot</h2>
				<p class="mb-6 text-text-secondary">{error}</p>
				<a
					href="/bands"
					class="rounded-lg bg-stone-900 px-6 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Go to My Bands
				</a>
			</div>
		</div>
	{:else if plot}
		<!-- Header toolbar -->
		<div class="flex shrink-0 items-center justify-between gap-4">
			<div class="min-w-0 flex-1">
				<div class="mb-0.5 text-sm font-medium text-text-tertiary">{bandName}</div>
				<h1 class="font-serif text-2xl font-bold text-text-primary">{plotName}</h1>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<button
					onclick={copyLink}
					class="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
					title="Copy share link"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
						<path
							d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
						/>
					</svg>
					{copied ? 'Copied!' : 'Copy Link'}
				</button>
				<button
					onclick={handleImport}
					disabled={importing || importSuccess}
					class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{#if importSuccess}
						Imported! Redirecting...
					{:else if importing}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-stone-900 dark:border-t-transparent"
						></div>
						Importing...
					{:else}
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
						Import to My Plots
					{/if}
				</button>
			</div>
		</div>

		<!-- Main content: canvas + sidebar -->
		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<!-- Canvas area -->
			<div
				bind:this={canvasWrapperEl}
				class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden"
			>
				<div
					class="border border-border-primary bg-surface p-3 shadow-sm"
					style="width: {canvasPixelWidth + 24}px;"
				>
					<div
						bind:this={canvasEl}
						class="relative overflow-hidden bg-white dark:bg-gray-800"
						style="width: {canvasPixelWidth}px; height: {canvasPixelHeight}px;"
					>
						<CanvasOverlay
							showZones={true}
							stageWidth={plot.stageWidth}
							stageDepth={plot.stageDepth}
							{pxPerFoot}
							itemCount={plot.items.length}
						/>

						{#each plot.items as item (item.id)}
							<div
								class="absolute"
								style="left: {item.position.x * pxPerFoot}px; top: {item.position.y *
									pxPerFoot}px; width: {item.position.width * pxPerFoot}px; height: {item.position
									.height * pxPerFoot}px;"
							>
								{#if item.type === 'stageDeck'}
									<StageDeck
										size={item.currentVariant || '4x4'}
										x={0}
										y={0}
										class="h-full w-full"
									/>
								{:else if item.type === 'riser'}
									<div
										class="flex h-full w-full items-center justify-center rounded border-2 border-gray-500 bg-gray-400/50 dark:border-gray-400 dark:bg-gray-600/50"
									>
										<div class="text-center leading-tight">
											<div class="text-[10px] font-bold text-gray-700 dark:text-gray-200">
												RISER
											</div>
											<div class="text-[8px] text-gray-600 dark:text-gray-300">
												{item.itemData?.riserWidth ?? '?'}' x {item.itemData?.riserDepth ?? '?'}'
											</div>
											{#if item.itemData?.riserHeight}
												<div class="text-[7px] text-gray-500 dark:text-gray-400">
													h: {item.itemData.riserHeight}'
												</div>
											{/if}
										</div>
									</div>
								{:else}
									{@const src = getCurrentImageSrc(item)}
									{#if src}
										<img
											{src}
											alt={item.itemData?.name || item.name || 'Stage Item'}
											class="h-full w-full"
										/>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				</div>
				<div class="mt-2 text-xs text-text-tertiary">
					Stage: {plot.stageWidth}' x {plot.stageDepth}' | {plot.items.length} items | {plot
						.musicians.length} musicians
				</div>
			</div>

			<!-- Sidebar -->
			<div class="flex w-80 shrink-0 flex-col overflow-hidden">
				<div
					class="flex flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-border-primary bg-surface p-4 shadow-sm"
				>
					<!-- Download PDF -->
					<div>
						<button
							onclick={handleExportPdf}
							disabled={exportingPdf}
							class="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
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
							{exportingPdf ? 'Exporting...' : 'Download PDF'}
						</button>
					</div>

					<!-- Input List -->
					{#if inputItems.length > 0}
						<div>
							<h3 class="mb-2 text-xs font-medium tracking-wider text-text-tertiary uppercase">
								Input List
							</h3>
							<div class="space-y-0.5">
								<div
									class="grid grid-cols-[2rem_1fr_1fr] gap-1.5 px-1.5 text-[10px] font-medium text-text-tertiary"
								>
									<span>CH</span>
									<span>Source</span>
									<span>Musician</span>
								</div>
								{#each inputItems as item}
									<div
										class="grid grid-cols-[2rem_1fr_1fr] gap-1.5 rounded-md bg-muted/30 px-1.5 py-1 text-xs"
									>
										<span class="font-mono font-bold text-text-primary">{item.channel}</span>
										<span class="truncate text-text-primary"
											>{item.name || item.itemData?.name || '-'}</span
										>
										<span class="truncate text-text-secondary">{item.musician || '-'}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Musicians -->
					{#if plot.musicians.length > 0}
						<div>
							<h3 class="mb-2 text-xs font-medium tracking-wider text-text-tertiary uppercase">
								Musicians
							</h3>
							<div class="space-y-1">
								{#each plot.musicians as musician}
									<div
										class="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5 text-xs"
									>
										<span class="font-medium text-text-primary">{musician.name}</span>
										<span class="text-text-secondary">{musician.instrument}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Contacts -->
					{#if plot.persons.length > 0}
						<div>
							<h3 class="mb-2 text-xs font-medium tracking-wider text-text-tertiary uppercase">
								Contacts
							</h3>
							<div class="space-y-1.5">
								{#each plot.persons as person}
									<div class="rounded-md bg-muted/30 px-2 py-1.5">
										<div class="text-xs font-medium text-text-primary">{person.name}</div>
										{#if person.role}
											<div class="text-[10px] text-text-secondary">{person.role}</div>
										{/if}
										{#if person.phone}
											<div class="mt-0.5 text-[10px] text-text-tertiary">{person.phone}</div>
										{/if}
										{#if person.email}
											<div class="text-[10px] text-text-tertiary">{person.email}</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
					<!-- Promo links -->
					<div class="mt-auto border-t border-border-primary pt-4 text-center">
						<p class="mb-2 text-xs text-text-tertiary">
							Made with <a
								href={MARKETING_URL}
								class="font-medium text-text-secondary underline hover:text-text-primary"
								target="_blank"
								rel="noopener noreferrer">Lost the Plot</a
							>
						</p>
						<a
							href={APP_URL}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-block rounded-lg border border-border-primary px-4 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-hover"
						>
							Create your own stage plot
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
