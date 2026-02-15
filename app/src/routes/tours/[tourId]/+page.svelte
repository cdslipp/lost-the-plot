<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { db } from '$lib/db';
	import DetailPageLayout from '$lib/components/DetailPageLayout.svelte';
	import {
		getTourById,
		updateTourField,
		updateTourName,
		getGigsForTour,
		type TourWithDetails
	} from '$lib/db/repositories/tours';
	import type { GigRow } from '$lib/db/repositories/gigs';
	import { formatTimeMs, timeStringToMs } from '$lib/utils/time';
	import { preferences } from '$lib/state/preferences.svelte';
	import { APP_NAME } from '$lib/config';

	let tourId = $derived($page.params.tourId as string);

	let tour = $state<TourWithDetails | null>(null);
	let gigs = $state<GigRow[]>([]);
	let loading = $state(true);
	let editingName = $state(false);
	let nameInput = $state('');

	// For adding gigs
	let showGigPicker = $state(false);
	let unassignedGigs = $state<GigRow[]>([]);

	async function load() {
		await db.init();
		const row = await getTourById(tourId);
		if (!row) {
			goto('/tours', { replaceState: true });
			return;
		}
		tour = row;
		nameInput = row.name;
		gigs = await getGigsForTour(tourId);

		// Auto-focus name if new
		const params = new URLSearchParams(window.location.search);
		if (params.get('new') === '1') {
			editingName = true;
			nameInput = row.name;
			history.replaceState(null, '', window.location.pathname);
		}

		loading = false;
	}

	async function saveName() {
		if (!tour || !nameInput.trim()) return;
		await updateTourName(tour.id, nameInput.trim());
		tour.name = nameInput.trim();
		editingName = false;
	}

	async function updateField(field: string, value: string | null) {
		if (!tour) return;
		await updateTourField(tour.id, field, value);
		(tour as any)[field] = value;
	}

	async function openGigPicker() {
		if (!tour) return;
		// Load band's gigs that aren't assigned to any tour
		const allBandGigs = await db.query<GigRow>(
			`SELECT id, name, venue, date, time, set_time, changeover_minutes, plot_id, notes, venue_id, tour_id
			 FROM gigs WHERE band_id = ? AND (tour_id IS NULL OR tour_id = '') ORDER BY date ASC`,
			[tour.band_id]
		);
		unassignedGigs = allBandGigs;
		showGigPicker = true;
	}

	async function addGigToTour(gigId: number) {
		await db.run("UPDATE gigs SET tour_id = ?, updated_at = datetime('now') WHERE id = ?", [
			tourId,
			gigId
		]);
		showGigPicker = false;
		gigs = await getGigsForTour(tourId);
		// Update gig count
		if (tour) tour.gig_count = gigs.length;
	}

	async function removeGigFromTour(gigId: number) {
		await db.run("UPDATE gigs SET tour_id = NULL, updated_at = datetime('now') WHERE id = ?", [
			gigId
		]);
		gigs = await getGigsForTour(tourId);
		if (tour) tour.gig_count = gigs.length;
	}

	function formatTime(timeStr: string | null): string {
		return formatTimeMs(timeStringToMs(timeStr), preferences.use24h);
	}

	onMount(() => {
		load();
	});
</script>

<svelte:head>
	<title>{tour?.name ?? 'Tour'} | {APP_NAME}</title>
</svelte:head>

<DetailPageLayout
	backHref="/tours"
	backLabel="Back to tours"
	name={tour?.name ?? ''}
	bind:editing={editingName}
	bind:nameInput
	{loading}
	onsave={saveName}
	oncancel={() => {
		editingName = false;
		if (tour) nameInput = tour.name;
	}}
	onedit={() => {
		if (tour) nameInput = tour.name;
		editingName = true;
	}}
>
	{#if tour}
		<div class="space-y-6">
			<!-- Tour info -->
			<div class="rounded-xl border border-border-primary bg-surface p-4 shadow-sm">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<span class="text-xs font-medium text-text-secondary">Band</span>
						<div>
							<a
								href="/bands/{tour.band_id}"
								class="text-sm text-text-primary hover:text-stone-600 hover:underline"
							>
								{tour.band_name}
							</a>
						</div>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">Start Date</label>
						<input
							type="date"
							value={tour.start_date || ''}
							onchange={(e) =>
								updateField('start_date', (e.target as HTMLInputElement).value || null)}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-text-secondary">End Date</label>
						<input
							type="date"
							value={tour.end_date || ''}
							onchange={(e) =>
								updateField('end_date', (e.target as HTMLInputElement).value || null)}
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						/>
					</div>
					<div class="sm:col-span-2">
						<label class="mb-1 block text-xs font-medium text-text-secondary">Notes</label>
						<textarea
							value={tour.notes || ''}
							onchange={(e) =>
								updateField('notes', (e.target as HTMLTextAreaElement).value || null)}
							rows="2"
							placeholder="Tour notes..."
							class="w-full rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						></textarea>
					</div>
				</div>
			</div>

			<!-- Gigs section -->
			<div>
				<div class="mb-2.5 flex items-center justify-between">
					<h2 class="font-serif text-xl font-semibold text-text-primary">
						Gigs ({gigs.length})
					</h2>
					<button
						onclick={openGigPicker}
						class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
								clip-rule="evenodd"
							/>
						</svg>
						Add Gig
					</button>
				</div>

				{#if gigs.length === 0}
					<div
						class="rounded-xl border border-dashed border-border-primary bg-surface p-6 text-center"
					>
						<p class="text-sm text-text-secondary">No gigs assigned to this tour yet.</p>
						<button onclick={openGigPicker} class="mt-2 text-sm text-text-primary hover:underline">
							Add gigs from your band
						</button>
					</div>
				{:else}
					<div class="space-y-1">
						{#each gigs as gig (gig.id)}
							<div
								class="group flex items-center justify-between rounded-xl border border-border-primary bg-surface p-3 shadow-sm"
							>
								<div>
									<div class="font-medium text-text-primary">{gig.name}</div>
									<div class="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
										{#if gig.date}
											<span>{gig.date}</span>
										{/if}
										{#if gig.set_time}
											<span>Set {formatTime(gig.set_time)}</span>
										{/if}
										{#if gig.venue}
											<span class="text-text-tertiary">{gig.venue}</span>
										{/if}
									</div>
								</div>
								<button
									onclick={() => removeGigFromTour(gig.id)}
									class="rounded p-1 text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
									title="Remove from tour"
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
		</div>
	{/if}
</DetailPageLayout>

<!-- Gig picker modal -->
{#if showGigPicker}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={() => (showGigPicker = false)}
	>
		<div
			class="max-h-96 w-full max-w-sm overflow-y-auto rounded-xl border border-border-primary bg-surface p-6 shadow-lg"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 font-serif text-xl font-semibold text-text-primary">Add Gig to Tour</h2>
			{#if unassignedGigs.length === 0}
				<p class="text-sm text-text-secondary">No unassigned gigs available for this band.</p>
			{:else}
				<div class="space-y-2">
					{#each unassignedGigs as gig}
						<button
							onclick={() => addGigToTour(gig.id)}
							class="w-full rounded-lg border border-border-primary px-4 py-3 text-left transition hover:bg-surface-hover"
						>
							<div class="text-sm font-medium text-text-primary">{gig.name}</div>
							<div class="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
								{#if gig.date}
									<span>{gig.date}</span>
								{/if}
								{#if gig.venue}
									<span>{gig.venue}</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
			<button
				onclick={() => (showGigPicker = false)}
				class="mt-4 w-full rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}
