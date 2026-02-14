<script lang="ts">
	import type { FestivalDayRow } from '$lib/db/repositories/festivals';

	type Props = {
		days: FestivalDayRow[];
		selectedDayId: string | null;
		onselect: (dayId: string) => void;
		oncreate: () => void;
		onrename: (dayId: string, name: string) => void;
		ondelete: (dayId: string) => void;
	};

	let { days, selectedDayId, onselect, oncreate, onrename, ondelete }: Props = $props();

	let editingDayId = $state<string | null>(null);
	let editInput = $state('');

	function startRename(day: FestivalDayRow) {
		editingDayId = day.id;
		editInput = day.name;
	}

	function saveRename() {
		if (!editingDayId || !editInput.trim()) return;
		onrename(editingDayId, editInput.trim());
		editingDayId = null;
		editInput = '';
	}

	function cancelRename() {
		editingDayId = null;
		editInput = '';
	}

	function handleTabKeydown(e: KeyboardEvent, day: FestivalDayRow) {
		if (e.key === 'Enter') {
			e.preventDefault();
			startRename(day);
		} else if (e.key === 'Delete' || e.key === 'Backspace') {
			if (!editingDayId) {
				e.preventDefault();
				ondelete(day.id);
			}
		}
	}
</script>

<div class="flex items-center gap-1 overflow-x-auto">
	{#each days as day (day.id)}
		{#if editingDayId === day.id}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					saveRename();
				}}
				class="flex items-center"
			>
				<input
					bind:value={editInput}
					onblur={saveRename}
					onkeydown={(e) => {
						if (e.key === 'Escape') cancelRename();
					}}
					class="w-24 rounded-lg border border-border-primary bg-surface px-3 py-1.5 text-sm font-medium text-text-primary focus:border-stone-500 focus:outline-none"
					autofocus
				/>
			</form>
		{:else}
			<div class="group relative flex-shrink-0">
				<button
					onclick={() => onselect(day.id)}
					ondblclick={() => startRename(day)}
					onkeydown={(e) => handleTabKeydown(e, day)}
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition {selectedDayId === day.id
						? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
						: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'}"
				>
					{day.name}
					{#if day.date}
						<span class="ml-1 text-xs opacity-60">{day.date}</span>
					{/if}
				</button>
				{#if days.length > 1}
					<button
						onclick={() => ondelete(day.id)}
						class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
						aria-label="Delete day"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-2.5 w-2.5"
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
				{/if}
			</div>
		{/if}
	{/each}
	<button
		onclick={oncreate}
		class="flex-shrink-0 rounded-lg px-3 py-1.5 text-sm text-text-tertiary transition hover:bg-surface-hover hover:text-text-primary"
		aria-label="Add day"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>
</div>
