<script lang="ts">
	import { SLOT_TYPES, type FestivalSlotRow, type SlotType } from '$lib/db/repositories/festivals';
	import { formatTimeMs, formatDurationMs } from '$lib/utils/time';
	import TimeInput from '$lib/components/TimeInput.svelte';
	import { preferences } from '$lib/state/preferences.svelte';
	import { ContextMenu } from 'bits-ui';

	type Props = {
		slots: FestivalSlotRow[];
		bandNameMap: Map<string, string>;
		oncreate: (slotType: SlotType) => void;
		onupdate: (id: string, data: Record<string, unknown>) => void;
		ondelete: (id: string) => void;
		onduplicate: (id: string) => void;
		onassignband: (slotId: string, bandId: string) => void;
	};

	let { slots, bandNameMap, oncreate, onupdate, ondelete, onduplicate, onassignband }: Props =
		$props();

	let expandedSlotId = $state<string | null>(null);
	let showAddMenu = $state(false);
	let dragOverSlotId = $state<string | null>(null);

	// Local edits for reactive end-time computation (preview while typing)
	let localEdits = $state<Record<string, { time_start?: number | null; duration?: number | null }>>(
		{}
	);

	function getLocalStart(slot: FestivalSlotRow): number | null {
		return localEdits[slot.id]?.time_start !== undefined
			? localEdits[slot.id].time_start!
			: slot.time_start;
	}

	function getLocalDuration(slot: FestivalSlotRow): number | null {
		return localEdits[slot.id]?.duration !== undefined
			? localEdits[slot.id].duration!
			: slot.duration;
	}

	function computeEndTime(slot: FestivalSlotRow): number | null {
		const start = getLocalStart(slot);
		const dur = getLocalDuration(slot);
		if (start != null && dur != null) return start + dur;
		return null;
	}

	function slotColour(type: SlotType): string {
		return SLOT_TYPES.find((s) => s.value === type)?.colour ?? '#9d9d9d';
	}

	function slotLabel(type: SlotType): string {
		return SLOT_TYPES.find((s) => s.value === type)?.label ?? type;
	}

	function toggleExpand(id: string) {
		expandedSlotId = expandedSlotId === id ? null : id;
		// Clear local edits when collapsing
		if (expandedSlotId !== id) {
			delete localEdits[id];
		}
	}

	function handleFieldBlur(slotId: string, field: string, value: unknown) {
		onupdate(slotId, { [field]: value });
		// Clear local edit for this field after persisting
		if (localEdits[slotId]) {
			delete localEdits[slotId][field as keyof (typeof localEdits)[string]];
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex flex-col gap-2" ondragend={() => (dragOverSlotId = null)}>
	{#each slots as slot (slot.id)}
		<ContextMenu.Root>
			<ContextMenu.Trigger>
				{#snippet child({ props })}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						{...props}
						class="group relative rounded-xl border bg-surface shadow-sm transition {dragOverSlotId ===
						slot.id
							? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
							: 'border-border-primary hover:border-stone-400'}"
						ondragover={(e) => {
							if (e.dataTransfer?.types.includes('application/x-festival-band')) {
								e.preventDefault();
								if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
								dragOverSlotId = slot.id;
							}
						}}
						ondragleave={() => (dragOverSlotId = null)}
						ondrop={(e) => {
							e.preventDefault();
							dragOverSlotId = null;
							const raw = e.dataTransfer?.getData('application/x-festival-band');
							if (!raw) return;
							try {
								const { id } = JSON.parse(raw);
								if (id) onassignband(slot.id, id);
							} catch {}
						}}
					>
						<!-- Slot summary row -->
						<button
							onclick={() => toggleExpand(slot.id)}
							class="flex w-full items-center gap-3 px-4 py-3 text-left"
						>
							<!-- Type badge -->
							<span
								class="inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
								style="background-color: {slotColour(slot.slot_type)}"
							>
								{slotLabel(slot.slot_type)}
							</span>

							<!-- Title -->
							<span class="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
								{slot.title || '(untitled)'}
								{#if slot.band_id && bandNameMap.get(slot.band_id)}
									<span class="font-normal text-text-secondary">
										— {bandNameMap.get(slot.band_id)}</span
									>
								{/if}
							</span>

							<!-- Time info -->
							<span class="flex-shrink-0 text-xs text-text-tertiary">
								{formatTimeMs(slot.time_start, preferences.use24h)}
								{#if slot.duration}
									<span class="mx-1 text-text-tertiary/50">&middot;</span>
									{formatDurationMs(slot.duration)}
								{/if}
							</span>

							<!-- Expand chevron -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4 flex-shrink-0 text-text-tertiary transition {expandedSlotId ===
								slot.id
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

						<!-- Expanded inline editor -->
						{#if expandedSlotId === slot.id}
							<div class="border-t border-border-primary px-4 py-3">
								<div class="grid grid-cols-3 gap-3">
									<!-- Row 1: Title, Band, Type -->
									<div>
										<label class="mb-1 block text-xs text-text-secondary">Title</label>
										<input
											type="text"
											value={slot.title}
											onblur={(e) =>
												handleFieldBlur(slot.id, 'title', (e.target as HTMLInputElement).value)}
											class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
										/>
									</div>

									<div>
										<label class="mb-1 block text-xs text-text-secondary">Band</label>
										{#if slot.band_id && bandNameMap.get(slot.band_id)}
											<div
												class="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-1.5"
											>
												<span class="flex-1 truncate text-sm">{bandNameMap.get(slot.band_id)}</span>
												<button
													onclick={() => onupdate(slot.id, { band_id: null })}
													class="flex-shrink-0 text-text-tertiary hover:text-text-primary"
													title="Unassign band">&times;</button
												>
											</div>
										{:else}
											<div
												class="rounded-lg border border-dashed border-border-primary px-3 py-1.5 text-sm text-text-tertiary"
											>
												Drag to assign
											</div>
										{/if}
									</div>

									<div>
										<label class="mb-1 block text-xs text-text-secondary">Type</label>
										<select
											value={slot.slot_type}
											onchange={(e) =>
												handleFieldBlur(
													slot.id,
													'slot_type',
													(e.target as HTMLSelectElement).value
												)}
											class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
										>
											{#each SLOT_TYPES as st (st.value)}
												<option value={st.value}>{st.label}</option>
											{/each}
										</select>
									</div>

									<!-- Row 2: Start, Duration, End -->
									<div>
										<label class="mb-1 block text-xs text-text-secondary">Start</label>
										<TimeInput
											time={slot.time_start}
											onsubmit={(ms) => handleFieldBlur(slot.id, 'time_start', ms)}
											onpreview={(ms) => {
												localEdits[slot.id] = {
													...localEdits[slot.id],
													time_start: ms
												};
											}}
											placeholder="Start"
											use24h={preferences.use24h}
											class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
										/>
									</div>

									<div>
										<label class="mb-1 block text-xs text-text-secondary">Duration</label>
										<TimeInput
											time={slot.duration}
											onsubmit={(ms) => handleFieldBlur(slot.id, 'duration', ms)}
											onpreview={(ms) => {
												localEdits[slot.id] = {
													...localEdits[slot.id],
													duration: ms
												};
											}}
											placeholder="Duration"
											isDuration={true}
											use24h={preferences.use24h}
											class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
										/>
									</div>

									<div>
										<label class="mb-1 block text-xs text-text-secondary">End</label>
										<div
											class="rounded-lg border border-border-primary bg-muted/30 px-3 py-1.5 text-sm text-text-tertiary"
										>
											{formatTimeMs(computeEndTime(slot), preferences.use24h)}
										</div>
									</div>

									<!-- Row 3: Note (full width) -->
									<div class="col-span-3">
										<label class="mb-1 block text-xs text-text-secondary">Note</label>
										<textarea
											value={slot.note}
											onblur={(e) =>
												handleFieldBlur(slot.id, 'note', (e.target as HTMLTextAreaElement).value)}
											rows="2"
											class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
										></textarea>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/snippet}
			</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Content
					class="z-50 w-[200px] rounded-xl border border-gray-300 bg-white px-1 py-1.5 shadow-lg dark:border-gray-600 dark:bg-gray-800"
				>
					<ContextMenu.Item
						onSelect={() => onduplicate(slot.id)}
						class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
						>Duplicate</ContextMenu.Item
					>
					{#if slot.band_id}
						<ContextMenu.Item
							onSelect={() => onupdate(slot.id, { band_id: null })}
							class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
							>Unassign Band</ContextMenu.Item
						>
					{/if}
					<ContextMenu.Separator class="-mx-1 my-1 block h-px bg-muted" />
					<ContextMenu.Item
						onSelect={() => ondelete(slot.id)}
						class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-600/30"
						>Delete</ContextMenu.Item
					>
				</ContextMenu.Content>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	{/each}

	<!-- Add slot button -->
	<div class="relative">
		<button
			onclick={() => (showAddMenu = !showAddMenu)}
			class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-primary bg-surface px-4 py-3 text-sm text-text-secondary transition hover:border-stone-400 hover:bg-surface-hover hover:text-text-primary"
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
			Add Slot
		</button>

		{#if showAddMenu}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				onclick={(e) => e.stopPropagation()}
				class="absolute top-full left-1/2 z-10 mt-1 w-48 -translate-x-1/2 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
			>
				{#each SLOT_TYPES as st (st.value)}
					<button
						onclick={() => {
							oncreate(st.value);
							showAddMenu = false;
						}}
						class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover"
					>
						<span
							class="inline-block h-2.5 w-2.5 rounded-full"
							style="background-color: {st.colour}"
						></span>
						{st.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
