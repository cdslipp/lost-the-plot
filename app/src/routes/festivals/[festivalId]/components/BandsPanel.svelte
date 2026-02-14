<script lang="ts">
	import { generateId } from '@stageplotter/shared';
	import {
		listFestivalBands,
		createFestivalBand,
		updateFestivalBand,
		type FestivalBandRow,
		type AdvanceStatus
	} from '$lib/db/repositories/festivalBands';

	type Props = {
		festivalId: string;
		onbandschanged?: () => void;
	};

	let { festivalId, onbandschanged }: Props = $props();

	let bands = $state<FestivalBandRow[]>([]);
	let newBandName = $state('');
	let bandNameInputEl = $state<HTMLInputElement | null>(null);

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

	export async function reload() {
		bands = await listFestivalBands(festivalId);
		onbandschanged?.();
	}

	async function handleAddBand() {
		if (!newBandName.trim()) return;
		const id = generateId();
		await createFestivalBand(id, festivalId, newBandName.trim());
		newBandName = '';
		await reload();
	}

	async function handleFieldBlur(bandId: string, field: string, value: string | number | null) {
		await updateFestivalBand(bandId, {
			[field]: typeof value === 'number' ? value : value || null
		});
		await reload();
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
			draggable={true}
			ondragstart={(e) => {
				e.dataTransfer?.setData(
					'application/x-festival-band',
					JSON.stringify({ id: band.id, name: band.name })
				);
				if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
			}}
		>
			<div class="flex flex-col gap-2 px-3 py-2">
				<!-- Row 1: Name + headliner star + edit link -->
				<div class="flex items-center gap-2">
					<input
						type="text"
						value={band.name}
						onblur={(e) => handleFieldBlur(band.id, 'name', (e.target as HTMLInputElement).value)}
						class="min-w-0 flex-1 cursor-grab rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-text-primary hover:border-border-primary focus:cursor-text focus:border-stone-500 focus:outline-none active:cursor-grabbing"
					/>
					{#if band.is_headliner === 1}
						<span class="text-amber-500" title="Headliner">★</span>
					{/if}
					<a
						href="/festivals/{festivalId}/bands/{band.id}"
						class="flex-shrink-0 text-text-tertiary transition hover:text-text-primary"
						title="Edit band details"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
					</a>
				</div>

				<!-- Row 2: Headliner checkbox -->
				<label class="flex items-center gap-2 text-xs text-text-primary">
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

				<!-- Row 3: Advance status -->
				<select
					value={band.advance_status}
					onchange={(e) =>
						handleFieldBlur(band.id, 'advance_status', (e.target as HTMLSelectElement).value)}
					class="w-full rounded-md border bg-transparent px-2 py-1 text-xs font-medium focus:outline-none {advanceStatusColors[
						band.advance_status ?? 'no_contact'
					]}"
				>
					{#each advanceStatuses as status (status.value)}
						<option value={status.value}>{status.label}</option>
					{/each}
				</select>

				<!-- Row 4: Notes -->
				<textarea
					value={band.notes ?? ''}
					onblur={(e) => handleFieldBlur(band.id, 'notes', (e.target as HTMLTextAreaElement).value)}
					rows="2"
					placeholder="Notes..."
					class="w-full rounded-md border border-border-primary bg-transparent px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:border-stone-500 focus:outline-none"
				></textarea>
			</div>
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
		<button type="submit" class="hidden" aria-label="Add band"></button>
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
