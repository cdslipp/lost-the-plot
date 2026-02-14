<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { beforeNavigate } from '$app/navigation';
	import { SetlistEditorState, setSetlistState } from '$lib/state/setlistEditorState.svelte';
	import SetlistEditorToolbar from '$lib/components/SetlistEditorToolbar.svelte';
	import EditableSetlistSheet from '$lib/components/EditableSetlistSheet.svelte';
	import SetlistSongInspector from '$lib/components/SetlistSongInspector.svelte';
	import SongCommandPalette from '$lib/components/SongCommandPalette.svelte';
	import { exportSetlistToPdf } from '$lib/utils/pdf';
	import type { SetlistSongRow } from '$lib/db/repositories/setlists';

	let bandId = $derived($page.params.bandId);

	const editor = new SetlistEditorState($page.params.bandId!, parseInt($page.params.gigId!));
	setSetlistState(editor);

	let loaded = $state(false);
	let notFound = $state(false);
	let commandPaletteOpen = $state(false);

	onMount(async () => {
		const ok = await editor.load();
		if (!ok) {
			notFound = true;
			return;
		}
		loaded = true;
	});

	// Flush pending writes before navigating away
	beforeNavigate(() => {
		editor.flushPositionWrites();
	});

	// Global Cmd+K handler
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			if (!commandPaletteOpen) {
				if (editor.activeSetlistId === null && editor.setlists.length > 0) {
					editor.activeSetlistId = editor.setlists[0].id;
				}
				commandPaletteOpen = true;
			}
		}
	}

	function openPaletteForSetlist(setlistId: number) {
		editor.activeSetlistId = setlistId;
		commandPaletteOpen = true;
	}

	function handleSongSelect(song: { id: number }) {
		if (editor.activeSetlistId !== null) {
			editor.addSongToSetlist(editor.activeSetlistId, song.id);
		}
	}

	function handleSongCreate(title: string) {
		if (editor.activeSetlistId !== null) {
			editor.createSongAndAdd(editor.activeSetlistId, title);
		}
	}

	async function handleExportPdf() {
		const sheets = Array.from(document.querySelectorAll('.setlist-sheet')) as HTMLElement[];
		await exportSetlistToPdf({
			title: editor.gigName,
			sheets,
			pageFormat: editor.pageSize === 1 ? 'a4' : 'letter'
		});
	}

	let songsInActiveSet = $derived(
		editor.activeSetlistId !== null
			? editor.songsInSetlist(editor.activeSetlistId)
			: new Set<number>()
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
	<div class="flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden">
		<SetlistEditorToolbar
			backHref="/bands/{bandId}"
			onAddSong={() => openPaletteForSetlist(editor.activeSetlistId ?? editor.setlists[0]?.id)}
			onExportPdf={handleExportPdf}
		/>

		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<div class="sheets-area">
				{#each editor.setlists as setlist (setlist.id)}
					{@const songs = editor.setlistSongs[setlist.id] || []}
					<div class="sheet-wrapper" onclick={() => (editor.activeSetlistId = setlist.id)}>
						<EditableSetlistSheet
							{songs}
							setName={setlist.name}
							font={editor.font}
							pageSize={editor.pageSize}
							showKeys={editor.showKeys}
							showNumbers={editor.showNumbers}
							selectedSongId={editor.selectedSongId}
							onreorder={(from, to) => editor.reorderSongs(setlist.id, from, to)}
							onremove={(entryId) => editor.removeSong(setlist.id, entryId)}
							onrename={(name) => editor.renameSetlist(setlist.id, name)}
							onaddclick={() => openPaletteForSetlist(setlist.id)}
							onsongclick={(entry) => (editor.selectedSongId = entry.song_id)}
						/>

						{#if editor.setlists.length > 1}
							<button
								class="delete-set-btn"
								onclick={(e) => {
									e.stopPropagation();
									editor.deleteSetlist(setlist.id);
								}}
								title="Delete this set"
							>
								Delete Set
							</button>
						{/if}
					</div>
				{/each}

				<button class="add-set-btn" onclick={() => editor.addSetlist()}>+ Add Set</button>
			</div>

			<div class="hidden w-80 shrink-0 flex-col overflow-hidden py-4 pr-4 md:flex print:hidden">
				<SetlistSongInspector />
			</div>
		</div>
	</div>

	<SongCommandPalette
		bind:open={commandPaletteOpen}
		songs={editor.songs}
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
		min-height: 0;
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
