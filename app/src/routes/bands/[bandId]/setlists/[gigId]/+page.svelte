<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { beforeNavigate } from '$app/navigation';
	import { SetlistEditorState, setSetlistState } from '$lib/state/setlistEditorState.svelte';
	import SetlistEditorToolbar from '$lib/components/SetlistEditorToolbar.svelte';
	import EditableSetlistSheet, {
		type SheetSection
	} from '$lib/components/EditableSetlistSheet.svelte';
	import SetlistSongInspector from '$lib/components/SetlistSongInspector.svelte';
	import SongCommandPalette from '$lib/components/SongCommandPalette.svelte';
	import { exportSetlistToPdf } from '$lib/utils/pdf';
	import type { SetlistSongRow } from '$lib/db/repositories/setlists';
	import { APP_NAME } from '$lib/config';

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

	// Global keydown handler: Cmd+K for command palette, Tab for cycling tabs
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

		// Tab key cycles through page group tabs (only when no input/textarea focused)
		if (e.key === 'Tab' && !commandPaletteOpen) {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
				e.preventDefault();
				editor.cycleTab();
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

<svelte:head>
	<title>{editor.gigName || 'Setlist'} | {APP_NAME}</title>
</svelte:head>

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
	<div class="flex h-[calc(100dvh-4.25rem)] flex-col gap-3 overflow-hidden px-4 pt-4">
		<div class="shrink-0">
			<SetlistEditorToolbar
				backHref="/bands/{bandId}"
				onAddSong={() => openPaletteForSetlist(editor.activeSetlistId ?? editor.setlists[0]?.id)}
				onExportPdf={handleExportPdf}
			/>
		</div>

		{#if editor.pageGroups.length > 1}
			<div class="tab-bar">
				{#each editor.pageGroups as group, i (group.set.id)}
					<button
						class="tab-btn"
						class:active={i === editor.activeGroupIndex}
						onclick={() => {
							editor.activeGroupIndex = i;
							editor.activeSetlistId = group.set.id;
						}}
					>
						{group.set.name}
					</button>
				{/each}
			</div>
		{/if}

		<div class="flex min-h-0 flex-1 gap-5 overflow-hidden">
			<div class="sheets-area">
				{#if editor.pageGroups[editor.activeGroupIndex]}
					{@const group = editor.pageGroups[editor.activeGroupIndex]}
					{@const sections: SheetSection[] = [
						{
							setlistId: group.set.id,
							name: group.set.name,
							type: 'set',
							songs: editor.setlistSongs[group.set.id] || []
						},
						...group.encores.map((enc) => ({
							setlistId: enc.id,
							name: enc.name,
							type: enc.type,
							songs: editor.setlistSongs[enc.id] || []
						}))
					]}
					<div class="sheet-wrapper" onclick={() => (editor.activeSetlistId = group.set.id)}>
						<EditableSetlistSheet
							{sections}
							font={editor.font}
							pageSize={editor.pageSize}
							showKeys={editor.showKeys}
							showNumbers={editor.showNumbers}
							textCase={editor.textCase}
							selectedSongId={editor.selectedSongId}
							onreorder={(setlistId, from, to) => editor.reorderSongs(setlistId, from, to)}
							onremove={(setlistId, entryId) => editor.removeSong(setlistId, entryId)}
							onrename={(setlistId, name) => editor.renameSetlist(setlistId, name)}
							onaddclick={(setlistId) => openPaletteForSetlist(setlistId)}
							onsongclick={(entry) => (editor.selectedSongId = entry.song_id)}
							ondeselect={() => (editor.selectedSongId = null)}
							onmove={(fromSetlistId, entryId, toSetlistId, toIndex) => {
								editor.moveSongBetweenSetlists(fromSetlistId, entryId, toSetlistId, toIndex);
							}}
						/>

						{#if editor.pageGroups.length > 1}
							<button
								class="delete-set-btn"
								onclick={(e) => {
									e.stopPropagation();
									editor.deleteSetlist(group.set.id);
								}}
								title="Delete this set and its encores"
							>
								Delete Set
							</button>
						{/if}
					</div>
				{/if}
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
	.tab-bar {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--color-border-primary, #e5e5e5);
		padding: 0 16px;
		flex-shrink: 0;
	}

	.tab-btn {
		all: unset;
		cursor: pointer;
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-tertiary, #a8a29e);
		border-bottom: 2px solid transparent;
		transition:
			color 0.15s,
			border-color 0.15s;
		margin-bottom: -1px;
	}

	.tab-btn:hover {
		color: var(--color-text-secondary, #78716c);
	}

	.tab-btn.active {
		color: var(--color-text-primary, #1c1917);
		border-bottom-color: var(--color-text-primary, #1c1917);
	}

	.sheets-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
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

	@media print {
		.sheets-area {
			background: white;
			padding: 0;
			gap: 0;
		}

		.sheet-wrapper {
			page-break-after: always;
		}

		.delete-set-btn {
			display: none !important;
		}
	}
</style>
