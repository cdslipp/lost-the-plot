<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { db } from '$lib/db';
	import { generateId } from '@stageplotter/shared';
	import DetailPageLayout from '$lib/components/DetailPageLayout.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import {
		getFestivalById,
		updateFestivalName,
		listFestivalDays,
		createFestivalDay,
		updateFestivalDay,
		deleteFestivalDay,
		listFestivalSlots,
		createFestivalSlot,
		updateFestivalSlot,
		deleteFestivalSlot,
		type FestivalDayRow,
		type FestivalSlotRow,
		type SlotType
	} from '$lib/db/repositories/festivals';
	import DayTabs from './components/DayTabs.svelte';
	import SlotList from './components/SlotList.svelte';
	import BandsPanel from './components/BandsPanel.svelte';

	let bandsPanelOpen = $state(true);

	let festivalId = $derived($page.params.festivalId as string);

	let festival = $state<{ id: string; name: string } | null>(null);
	let loading = $state(true);
	let editingName = $state(false);
	let nameInput = $state('');

	let days = $state<FestivalDayRow[]>([]);
	let selectedDayId = $state<string | null>(null);
	let slots = $state<FestivalSlotRow[]>([]);

	let deleteDayTarget = $state<{ id: string; name: string } | null>(null);

	async function load() {
		await db.init();
		const row = await getFestivalById(festivalId);
		if (!row) {
			goto('/festivals', { replaceState: true });
			return;
		}
		festival = row;
		nameInput = row.name;

		days = await listFestivalDays(festivalId);
		if (days.length === 0) {
			// Auto-create Day 1
			const dayId = generateId();
			await createFestivalDay(dayId, festivalId, 'Day 1', 0);
			days = await listFestivalDays(festivalId);
		}
		selectedDayId = days[0].id;
		slots = await listFestivalSlots(days[0].id);

		loading = false;

		if ($page.url.searchParams.has('new')) {
			editingName = true;
			goto(`/festivals/${festivalId}`, { replaceState: true });
		}
	}

	async function saveName() {
		if (!nameInput.trim()) return;
		await updateFestivalName(festivalId, nameInput.trim());
		festival = { ...festival!, name: nameInput.trim() };
		editingName = false;
	}

	function cancelEditName() {
		if (festival) nameInput = festival.name;
		editingName = false;
	}

	// --- Day management ---

	async function handleSelectDay(dayId: string) {
		selectedDayId = dayId;
		slots = await listFestivalSlots(dayId);
	}

	async function handleCreateDay() {
		const id = generateId();
		const name = `Day ${days.length + 1}`;
		await createFestivalDay(id, festivalId, name, days.length);
		days = await listFestivalDays(festivalId);
		selectedDayId = id;
		slots = await listFestivalSlots(id);
	}

	async function handleRenameDay(dayId: string, name: string) {
		await updateFestivalDay(dayId, { name });
		days = await listFestivalDays(festivalId);
	}

	function handleRequestDeleteDay(dayId: string) {
		const day = days.find((d) => d.id === dayId);
		if (!day) return;
		deleteDayTarget = { id: day.id, name: day.name };
	}

	async function confirmDeleteDay() {
		const target = deleteDayTarget;
		if (!target) return;
		deleteDayTarget = null;
		await deleteFestivalDay(target.id);
		days = await listFestivalDays(festivalId);
		if (selectedDayId === target.id) {
			selectedDayId = days.length > 0 ? days[0].id : null;
			slots = selectedDayId ? await listFestivalSlots(selectedDayId) : [];
		}
	}

	// --- Slot management ---

	async function handleCreateSlot(slotType: SlotType) {
		if (!selectedDayId) return;
		const id = generateId();
		const typeLabels: Record<SlotType, string> = {
			set: 'New Set',
			headliner: 'Headliner',
			changeover: 'Changeover',
			soundcheck: 'Soundcheck',
			announcement: 'Announcement',
			other: 'Other'
		};
		await createFestivalSlot(id, selectedDayId, {
			slot_type: slotType,
			title: typeLabels[slotType],
			sort_order: slots.length
		});
		slots = await listFestivalSlots(selectedDayId);
	}

	async function handleUpdateSlot(id: string, data: Record<string, unknown>) {
		await updateFestivalSlot(id, data);
		if (selectedDayId) {
			slots = await listFestivalSlots(selectedDayId);
		}
	}

	async function handleDeleteSlot(id: string) {
		await deleteFestivalSlot(id);
		if (selectedDayId) {
			slots = await listFestivalSlots(selectedDayId);
		}
	}

	async function handleDuplicateSlot(id: string) {
		if (!selectedDayId) return;
		const source = slots.find((s) => s.id === id);
		if (!source) return;
		const newId = generateId();
		await createFestivalSlot(newId, selectedDayId, {
			slot_type: source.slot_type,
			title: `${source.title} (copy)`,
			sort_order: slots.length,
			time_start: source.time_start,
			duration: source.duration
		});
		if (source.note || source.colour) {
			await updateFestivalSlot(newId, {
				...(source.note ? { note: source.note } : {}),
				...(source.colour ? { colour: source.colour } : {})
			});
		}
		slots = await listFestivalSlots(selectedDayId);
	}

	onMount(() => {
		load();
	});
</script>

<DetailPageLayout
	backHref="/festivals"
	backLabel="Back to festivals"
	name={festival?.name || ''}
	bind:editing={editingName}
	bind:nameInput
	{loading}
	onsave={saveName}
	oncancel={cancelEditName}
	onedit={() => (editingName = true)}
>
	{#if festival}
		<!-- Mobile: toggle bands panel -->
		<button
			onclick={() => (bandsPanelOpen = !bandsPanelOpen)}
			class="text-xs text-text-tertiary transition hover:text-text-primary md:hidden"
		>
			{bandsPanelOpen ? 'Hide' : 'Show'} Bands
		</button>

		<div class="flex flex-col gap-6 md:flex-row">
			<!-- Bands panel (left) -->
			<div class="w-full flex-shrink-0 md:w-[280px] {bandsPanelOpen ? '' : 'hidden md:block'}">
				<BandsPanel {festivalId} />
			</div>

			<!-- Schedule (right) -->
			<div class="min-w-0 flex-1">
				<DayTabs
					{days}
					{selectedDayId}
					onselect={handleSelectDay}
					oncreate={handleCreateDay}
					onrename={handleRenameDay}
					ondelete={handleRequestDeleteDay}
				/>

				<hr class="my-3 border-border-primary" />

				{#if selectedDayId}
					<SlotList
						{slots}
						oncreate={handleCreateSlot}
						onupdate={handleUpdateSlot}
						ondelete={handleDeleteSlot}
						onduplicate={handleDuplicateSlot}
					/>
				{/if}
			</div>
		</div>
	{/if}
</DetailPageLayout>

<ConfirmDialog
	bind:open={
		() => deleteDayTarget !== null,
		(v) => {
			if (!v) deleteDayTarget = null;
		}
	}
	title="Delete Day"
	description={deleteDayTarget
		? `Delete "${deleteDayTarget.name}"? All slots in this day will be removed.`
		: ''}
	confirmLabel="Delete"
	variant="destructive"
	onconfirm={confirmDeleteDay}
/>
