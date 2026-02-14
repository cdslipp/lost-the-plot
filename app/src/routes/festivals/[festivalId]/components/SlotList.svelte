<script lang="ts">
	import { SLOT_TYPES, type FestivalSlotRow, type SlotType } from '$lib/db/repositories/festivals';

	type Props = {
		slots: FestivalSlotRow[];
		oncreate: (slotType: SlotType) => void;
		onupdate: (id: string, data: Record<string, unknown>) => void;
		ondelete: (id: string) => void;
	};

	let { slots, oncreate, onupdate, ondelete }: Props = $props();

	let expandedSlotId = $state<string | null>(null);
	let showAddMenu = $state(false);

	function slotColour(type: SlotType): string {
		return SLOT_TYPES.find((s) => s.value === type)?.colour ?? '#9d9d9d';
	}

	function slotLabel(type: SlotType): string {
		return SLOT_TYPES.find((s) => s.value === type)?.label ?? type;
	}

	function formatMs(ms: number | null): string {
		if (ms == null) return '--:--';
		const totalMinutes = Math.floor(ms / 60000);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	}

	function formatDuration(ms: number | null): string {
		if (ms == null) return '';
		const totalMinutes = Math.round(ms / 60000);
		if (totalMinutes < 60) return `${totalMinutes}m`;
		const h = Math.floor(totalMinutes / 60);
		const m = totalMinutes % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	function parseTimeToMs(value: string): number | null {
		const match = value.match(/^(\d{1,2}):(\d{2})$/);
		if (!match) return null;
		const h = parseInt(match[1]);
		const m = parseInt(match[2]);
		if (h > 23 || m > 59) return null;
		return (h * 60 + m) * 60000;
	}

	function parseDurationToMs(value: string): number | null {
		const num = parseInt(value);
		if (isNaN(num) || num < 0) return null;
		return num * 60000;
	}

	function toggleExpand(id: string) {
		expandedSlotId = expandedSlotId === id ? null : id;
	}

	function handleFieldBlur(slotId: string, field: string, value: unknown) {
		onupdate(slotId, { [field]: value });
	}
</script>

<div class="flex flex-col gap-2">
	{#each slots as slot (slot.id)}
		<div
			class="group relative rounded-xl border border-border-primary bg-surface shadow-sm transition hover:border-stone-400"
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
				</span>

				<!-- Time info -->
				<span class="flex-shrink-0 text-xs text-text-tertiary">
					{formatMs(slot.time_start)}
					{#if slot.duration}
						<span class="mx-1 text-text-tertiary/50">&middot;</span>
						{formatDuration(slot.duration)}
					{/if}
				</span>

				<!-- Expand chevron -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4 flex-shrink-0 text-text-tertiary transition {expandedSlotId === slot.id
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

			<!-- Delete button -->
			<button
				onclick={() => ondelete(slot.id)}
				class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
				aria-label="Delete slot"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
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

			<!-- Expanded inline editor -->
			{#if expandedSlotId === slot.id}
				<div class="border-t border-border-primary px-4 py-3">
					<div class="grid grid-cols-2 gap-3">
						<!-- Title -->
						<div class="col-span-2">
							<label class="mb-1 block text-xs text-text-secondary">Title</label>
							<input
								type="text"
								value={slot.title}
								onblur={(e) =>
									handleFieldBlur(slot.id, 'title', (e.target as HTMLInputElement).value)}
								class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							/>
						</div>

						<!-- Slot type -->
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Type</label>
							<select
								value={slot.slot_type}
								onchange={(e) =>
									handleFieldBlur(slot.id, 'slot_type', (e.target as HTMLSelectElement).value)}
								class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							>
								{#each SLOT_TYPES as st (st.value)}
									<option value={st.value}>{st.label}</option>
								{/each}
							</select>
						</div>

						<!-- Start time -->
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Start Time</label>
							<input
								type="text"
								value={formatMs(slot.time_start)}
								placeholder="HH:MM"
								onblur={(e) => {
									const ms = parseTimeToMs((e.target as HTMLInputElement).value);
									if (ms !== null) handleFieldBlur(slot.id, 'time_start', ms);
								}}
								class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							/>
						</div>

						<!-- Duration -->
						<div>
							<label class="mb-1 block text-xs text-text-secondary">Duration (min)</label>
							<input
								type="number"
								value={slot.duration != null ? Math.round(slot.duration / 60000) : ''}
								min="0"
								onblur={(e) => {
									const ms = parseDurationToMs((e.target as HTMLInputElement).value);
									if (ms !== null) handleFieldBlur(slot.id, 'duration', ms);
								}}
								class="w-full rounded-lg border border-border-primary bg-transparent px-3 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:outline-none"
							/>
						</div>

						<!-- End time (read-only, auto-computed) -->
						<div>
							<label class="mb-1 block text-xs text-text-secondary">End Time</label>
							<div
								class="rounded-lg border border-border-primary bg-muted/30 px-3 py-1.5 text-sm text-text-tertiary"
							>
								{formatMs(slot.time_end)}
							</div>
						</div>

						<!-- Note -->
						<div class="col-span-2">
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
				class="absolute bottom-full left-1/2 z-10 mb-1 w-48 -translate-x-1/2 rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
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
