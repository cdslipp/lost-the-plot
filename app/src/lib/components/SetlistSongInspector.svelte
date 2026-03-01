<script lang="ts">
	import { getSetlistState } from '$lib/state/setlistEditorState.svelte';
	import SegmentedToggle from './SegmentedToggle.svelte';
	import ToggleSwitch from './ToggleSwitch.svelte';
	import { toggleMode } from 'mode-watcher';

	const editor = getSetlistState();

	let selectedSong = $derived(
		editor.selectedSongId != null
			? (editor.songs.find((s) => s.id === editor.selectedSongId) ?? null)
			: null
	);

	const fontOptions = [
		{ label: 'Sans', value: '0' },
		{ label: 'Serif', value: '1' },
		{ label: 'Marker', value: '2' }
	] as const;

	const pageSizeOptions = [
		{ label: 'Letter', value: '0' },
		{ label: 'A4', value: '1' }
	] as const;

	const textCaseOptions = [
		{ label: 'As typed', value: '0' },
		{ label: 'UPPER', value: '1' },
		{ label: 'Title', value: '2' }
	] as const;

	let fontValue = $derived(String(editor.font));
	let pageSizeValue = $derived(String(editor.pageSize));
	let textCaseValue = $derived(String(editor.textCase));

	function handleChange(field: string, value: string | number | null) {
		if (editor.selectedSongId == null) return;
		editor.updateSong(editor.selectedSongId, field, value);
	}
</script>

<div
	class="flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm print:hidden"
>
	<div class="border-b border-border-primary bg-muted/30 px-4 py-3">
		<h3 class="text-sm font-semibold text-text-primary">
			{selectedSong ? 'Song Details' : 'Display Settings'}
		</h3>
	</div>

	{#if selectedSong}
		<div class="flex flex-1 flex-col gap-3 overflow-auto p-4">
			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-text-secondary">Title</span>
				<input
					value={selectedSong.title}
					onchange={(e) => handleChange('title', (e.target as HTMLInputElement).value)}
					class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					placeholder="Title"
				/>
			</label>

			<div class="grid grid-cols-2 gap-2">
				<label class="flex flex-col gap-1">
					<span class="text-xs font-medium text-text-secondary">Key</span>
					<input
						value={selectedSong.starting_key || ''}
						onchange={(e) =>
							handleChange('starting_key', (e.target as HTMLInputElement).value || null)}
						class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						placeholder="e.g. Am"
					/>
				</label>

				<label class="flex flex-col gap-1">
					<span class="text-xs font-medium text-text-secondary">BPM</span>
					<input
						value={selectedSong.starting_tempo ?? ''}
						onchange={(e) => {
							const v = (e.target as HTMLInputElement).value;
							handleChange('starting_tempo', v ? Number(v) : null);
						}}
						type="number"
						class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
						placeholder="BPM"
					/>
				</label>
			</div>

			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-text-secondary">Instruments</span>
				<input
					value={selectedSong.instruments || ''}
					onchange={(e) =>
						handleChange('instruments', (e.target as HTMLInputElement).value || null)}
					class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					placeholder="Instruments/gear"
				/>
			</label>

			<label class="flex flex-col gap-1">
				<span class="text-xs font-medium text-text-secondary">Notes</span>
				<textarea
					value={selectedSong.notes || ''}
					onchange={(e) => handleChange('notes', (e.target as HTMLTextAreaElement).value || null)}
					class="rounded-lg border border-border-primary bg-surface px-2 py-1.5 text-sm text-text-primary focus:border-stone-500 focus:ring-2 focus:ring-stone-500"
					placeholder="Notes"
					rows="3"
				></textarea>
			</label>

			<label class="flex items-center gap-2">
				<button
					type="button"
					class="flex h-5 w-5 items-center justify-center rounded border border-border-primary text-text-secondary transition-colors hover:text-yellow-500"
					class:starred={selectedSong.starred === 1}
					title={selectedSong.starred === 1 ? 'Unstar song' : 'Star song'}
					onclick={() => handleChange('starred', selectedSong!.starred === 1 ? 0 : 1)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="h-3.5 w-3.5"
					>
						<path
							fill-rule="evenodd"
							d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
				<span class="text-xs font-medium text-text-secondary">Starred</span>
			</label>
		</div>
	{:else}
		<div class="flex flex-1 flex-col overflow-auto">
			<div class="space-y-4 p-4">
				<!-- Font toggle -->
				<div class="flex items-center justify-between">
					<span class="text-xs text-text-secondary">Font</span>
					<SegmentedToggle
						options={[...fontOptions]}
						value={fontValue}
						onchange={(v) => (editor.font = Number(v))}
					/>
				</div>

				<!-- Page Size toggle -->
				<div class="flex items-center justify-between">
					<span class="text-xs text-text-secondary">Page Size</span>
					<SegmentedToggle
						options={[...pageSizeOptions]}
						value={pageSizeValue}
						onchange={(v) => (editor.pageSize = Number(v))}
					/>
				</div>

				<!-- Show Keys toggle -->
				<div class="flex items-center justify-between">
					<span class="text-xs text-text-secondary">Show Keys</span>
					<ToggleSwitch
						checked={editor.showKeys}
						onchange={(v) => (editor.showKeys = v)}
						label="Show Keys"
					/>
				</div>

				<!-- Text Case toggle -->
				<div class="flex items-center justify-between">
					<span class="text-xs text-text-secondary">Text Case</span>
					<SegmentedToggle
						options={[...textCaseOptions]}
						value={textCaseValue}
						onchange={(v) => (editor.textCase = Number(v))}
					/>
				</div>

				<!-- Show Numbers toggle -->
				<div class="flex items-center justify-between">
					<span class="text-xs text-text-secondary">Show Numbers</span>
					<ToggleSwitch
						checked={editor.showNumbers}
						onchange={(v) => (editor.showNumbers = v)}
						label="Show Numbers"
					/>
				</div>
			</div>

			<!-- Sections outline -->
			<div class="border-t border-border-primary px-4 pt-4 pb-2">
				<span class="mb-2 block text-xs font-semibold text-text-secondary">Sections</span>
				<div class="space-y-0.5">
					{#each editor.pageGroups as group}
						<button
							class="w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-surface-hover {editor.activeSetlistId ===
							group.set.id
								? 'bg-surface-hover font-semibold text-text-primary'
								: 'text-text-secondary'}"
							onclick={() => (editor.activeSetlistId = group.set.id)}
						>
							{group.set.name}
						</button>
						{#each group.encores as encore}
							<button
								class="w-full rounded py-1 pr-2 pl-5 text-left text-xs italic transition-colors hover:bg-surface-hover {editor.activeSetlistId ===
								encore.id
									? 'bg-surface-hover font-semibold text-text-primary'
									: 'text-text-tertiary'}"
								onclick={() => (editor.activeSetlistId = encore.id)}
							>
								{encore.name}
							</button>
						{/each}
					{/each}
				</div>
			</div>

			<!-- Add Set / Add Encore buttons -->
			<div class="flex gap-2 border-t border-border-primary px-4 pt-3 pb-2">
				<button
					class="flex-1 rounded-lg border border-dashed border-border-primary px-2 py-1.5 text-xs text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
					onclick={() => editor.addSetlist()}
				>
					+ Add Set
				</button>
				<button
					class="flex-1 rounded-lg border border-dashed border-border-primary px-2 py-1.5 text-xs text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
					onclick={() => {
						const activeSet = editor.setlists.find(
							(s) => s.id === editor.activeSetlistId && s.type === 'set'
						);
						const targetSetId = activeSet
							? activeSet.id
							: editor.pageGroups[editor.pageGroups.length - 1]?.set.id;
						if (targetSetId != null) editor.addEncore(targetSetId);
					}}
				>
					+ Add Encore
				</button>
			</div>

			<div class="text-center text-[10px] text-text-tertiary">
				Select a song to edit its details
			</div>

			<!-- Dark mode toggle at bottom -->
			<div class="mt-auto flex justify-center border-t border-border-primary pt-3 pb-1">
				<button
					onclick={toggleMode}
					class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-text-tertiary transition hover:bg-surface-hover hover:text-text-secondary"
					title="Toggle dark mode"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="hidden h-3.5 w-3.5 dark:block"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
							clip-rule="evenodd"
						/>
					</svg>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="block h-3.5 w-3.5 dark:hidden"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
					</svg>
					<span class="block dark:hidden">Dark mode</span>
					<span class="hidden dark:block">Light mode</span>
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.starred {
		color: #eab308;
		border-color: #eab308;
	}
</style>
