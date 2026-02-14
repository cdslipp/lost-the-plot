<script lang="ts">
	import { getSetlistState } from '$lib/state/setlistEditorState.svelte';

	const editor = getSetlistState();

	let selectedSong = $derived(
		editor.selectedSongId != null
			? (editor.songs.find((s) => s.id === editor.selectedSongId) ?? null)
			: null
	);

	function handleChange(field: string, value: string | number | null) {
		if (editor.selectedSongId == null) return;
		editor.updateSong(editor.selectedSongId, field, value);
	}
</script>

<div
	class="flex h-full flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-sm print:hidden"
>
	<div class="border-b border-border-primary bg-muted/30 px-4 py-3">
		<h3 class="text-sm font-semibold text-text-primary">Song Details</h3>
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
		<div class="flex flex-1 items-center justify-center p-4">
			<p class="text-center text-sm text-text-tertiary">
				Click a song on the setlist to edit its details
			</p>
		</div>
	{/if}
</div>

<style>
	.starred {
		color: #eab308;
		border-color: #eab308;
	}
</style>
