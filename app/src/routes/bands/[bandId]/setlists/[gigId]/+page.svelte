<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { SetlistEditorState, setSetlistState } from '$lib/state/setlistEditorState.svelte';
	import SetlistEditorToolbar from '$lib/components/SetlistEditorToolbar.svelte';
	import EditableSetlistSheet from '$lib/components/EditableSetlistSheet.svelte';
	import SongCommandPalette from '$lib/components/SongCommandPalette.svelte';

	let bandId = $derived($page.params.bandId);
	let gigId = $derived(parseInt($page.params.gigId));

	const state = new SetlistEditorState($page.params.bandId!, parseInt($page.params.gigId!));
	setSetlistState(state);

	let loaded = $state(false);
	let notFound = $state(false);
	let commandPaletteOpen = $state(false);

	onMount(async () => {
		const ok = await state.load();
		if (!ok) {
			notFound = true;
			return;
		}
		loaded = true;
	});

	// Flush pending writes before navigating away
	beforeNavigate(() => {
		state.flushPositionWrites();
	});

	// Global Cmd+K handler
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (!commandPaletteOpen) {
				// Default to first setlist if none active
				if (state.activeSetlistId === null && state.setlists.length > 0) {
					state.activeSetlistId = state.setlists[0].id;
				}
				commandPaletteOpen = true;
			}
		}
	}

	function openPaletteForSetlist(setlistId: number) {
		state.activeSetlistId = setlistId;
		commandPaletteOpen = true;
	}

	function handleSongSelect(song: { id: number }) {
		if (state.activeSetlistId !== null) {
			state.addSongToSetlist(state.activeSetlistId, song.id);
		}
	}

	function handleSongCreate(title: string) {
		if (state.activeSetlistId !== null) {
			state.createSongAndAdd(state.activeSetlistId, title);
		}
	}

	let songsInActiveSet = $derived(
		state.activeSetlistId !== null ? state.songsInSetlist(state.activeSetlistId) : new Set<number>()
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if notFound}
	<div class="flex h-full flex-1 flex-col items-center justify-center gap-4 text-text-secondary">
		<p>Gig not found.</p>
		<a href="/bands/{bandId}" class="text-sm underline hover:text-text-primary">Back to band</a>
	</div>
{:else if !loaded}
	<div class="flex h-full flex-1 items-center justify-center">
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
		></div>
	</div>
{:else}
	<SetlistEditorToolbar
		backHref="/bands/{bandId}"
		onAddSong={() => openPaletteForSetlist(state.activeSetlistId ?? state.setlists[0]?.id)}
	/>

	<div class="sheets-area">
		{#each state.setlists as setlist (setlist.id)}
			{@const songs = state.setlistSongs[setlist.id] || []}
			<div class="sheet-wrapper" onclick={() => (state.activeSetlistId = setlist.id)}>
				<EditableSetlistSheet
					{songs}
					setName={setlist.name}
					font={state.font}
					pageSize={state.pageSize}
					showKeys={state.showKeys}
					onreorder={(from, to) => state.reorderSongs(setlist.id, from, to)}
					onremove={(entryId) => state.removeSong(setlist.id, entryId)}
					onrename={(name) => state.renameSetlist(setlist.id, name)}
					onaddclick={() => openPaletteForSetlist(setlist.id)}
				/>

				{#if state.setlists.length > 1}
					<button
						class="delete-set-btn"
						onclick={(e) => {
							e.stopPropagation();
							state.deleteSetlist(setlist.id);
						}}
						title="Delete this set"
					>
						Delete Set
					</button>
				{/if}
			</div>
		{/each}

		<button class="add-set-btn" onclick={() => state.addSetlist()}>+ Add Set</button>
	</div>

	<SongCommandPalette
		bind:open={commandPaletteOpen}
		songs={state.songs}
		songsInSet={songsInActiveSet}
		onselect={handleSongSelect}
		oncreate={handleSongCreate}
	/>
{/if}

<style>
	.sheets-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 32px;
		padding: 32px 16px;
		overflow-y: auto;
		background: var(--color-muted, #f5f5f4);
	}

	.sheet-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.delete-set-btn {
		all: unset;
		cursor: pointer;
		font-size: 12px;
		color: var(--color-text-tertiary, #a8a29e);
		padding: 4px 12px;
		border-radius: 6px;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.delete-set-btn:hover {
		color: #ef4444;
		background: rgb(239 68 68 / 0.1);
	}

	.add-set-btn {
		all: unset;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-secondary, #78716c);
		padding: 12px 24px;
		border: 2px dashed var(--color-border-primary, #e5e5e5);
		border-radius: 12px;
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.add-set-btn:hover {
		border-color: var(--color-text-secondary, #78716c);
		color: var(--color-text-primary, #1c1917);
	}

	@media print {
		.sheets-area {
			background: white;
			padding: 0;
			gap: 0;
		}

		.sheet-wrapper {
			page-break-after: always;
		}

		.delete-set-btn,
		.add-set-btn {
			display: none !important;
		}
	}
</style>
