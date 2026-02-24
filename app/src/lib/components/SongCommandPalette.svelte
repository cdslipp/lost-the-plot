<script lang="ts">
	import { Command } from 'bits-ui';
	import type { SongRow } from '$lib/db/repositories/songs';
	import { commandScore } from '$lib/utils/search';

	type Props = {
		open?: boolean;
		songs: SongRow[];
		songsInSet: Set<number>;
		onselect?: (song: SongRow) => void;
		oncreate?: (title: string) => void;
		onclose?: () => void;
	};

	let { open = $bindable(false), songs, songsInSet, onselect, oncreate, onclose }: Props = $props();

	let searchValue = $state('');

	const starredSongs = $derived(songs.filter((s) => s.starred));
	const unstarredSongs = $derived(songs.filter((s) => !s.starred));
	const showCreateOption = $derived(
		searchValue.trim().length > 0 &&
			!songs.some((s) => s.title.toLowerCase() === searchValue.trim().toLowerCase())
	);

	function handleSelect(song: SongRow) {
		if (songsInSet.has(song.id)) return;
		onselect?.(song);
		searchValue = '';
		open = false;
	}

	function handleCreate() {
		const title = searchValue.trim();
		if (!title) return;
		oncreate?.(title);
		searchValue = '';
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
			onclose?.();
		}
	}

	function handleBackdropClick() {
		open = false;
		onclose?.();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute inset-0 bg-black/50 backdrop-blur-sm"
			onclick={handleBackdropClick}
			onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		></div>
		<div class="relative mx-4 w-[min(500px,95vw)]">
			<Command.Root
				class="flex flex-col overflow-hidden rounded-xl border border-border-primary bg-surface shadow-2xl"
				shouldFilter={true}
				filter={commandScore}
				loop={true}
			>
				<div class="border-b border-border-primary px-4 py-3">
					<Command.Input
						bind:value={searchValue}
						class="w-full bg-transparent text-lg outline-none placeholder:text-text-secondary"
						placeholder="Search songs or type to create..."
						autofocus
					/>
				</div>

				<Command.List class="flex-1 overflow-hidden">
					<Command.Viewport class="max-h-[50vh] overflow-y-auto p-2">
						<Command.Empty class="py-8 text-center text-text-secondary">
							No songs found.
						</Command.Empty>

						{#if starredSongs.length > 0}
							<Command.Group>
								<Command.GroupHeading
									class="px-2 py-1.5 text-xs font-semibold tracking-wider text-text-secondary uppercase"
								>
									Starred
								</Command.GroupHeading>
								<Command.GroupItems>
									{#each starredSongs as song (song.id)}
										{@const inSet = songsInSet.has(song.id)}
										<Command.Item
											value={song.title}
											disabled={inSet}
											class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors {inSet
												? 'opacity-40'
												: 'hover:bg-muted data-[selected]:bg-muted'}"
											onSelect={() => handleSelect(song)}
										>
											<span class="flex-1 text-sm text-text-primary">
												{song.title}
												{#if inSet}
													<span class="text-xs text-text-tertiary">(in set)</span>
												{/if}
											</span>
											{#if song.starting_key}
												<span
													class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
												>
													{song.starting_key}
												</span>
											{/if}
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						{/if}

						{#if unstarredSongs.length > 0}
							<Command.Group>
								<Command.GroupHeading
									class="px-2 py-1.5 text-xs font-semibold tracking-wider text-text-secondary uppercase"
								>
									Songs
								</Command.GroupHeading>
								<Command.GroupItems>
									{#each unstarredSongs as song (song.id)}
										{@const inSet = songsInSet.has(song.id)}
										<Command.Item
											value={song.title}
											disabled={inSet}
											class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors {inSet
												? 'opacity-40'
												: 'hover:bg-muted data-[selected]:bg-muted'}"
											onSelect={() => handleSelect(song)}
										>
											<span class="flex-1 text-sm text-text-primary">
												{song.title}
												{#if inSet}
													<span class="text-xs text-text-tertiary">(in set)</span>
												{/if}
											</span>
											{#if song.starting_key}
												<span
													class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300"
												>
													{song.starting_key}
												</span>
											{/if}
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						{/if}

						{#if showCreateOption}
							<Command.Group>
								<Command.GroupItems>
									<Command.Item
										value={'__create__ ' + searchValue.trim()}
										class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted data-[selected]:bg-muted"
										onSelect={handleCreate}
									>
										<span class="text-text-secondary">+</span>
										<span class="text-text-primary"
											>Create "<strong>{searchValue.trim()}</strong>"</span
										>
									</Command.Item>
								</Command.GroupItems>
							</Command.Group>
						{/if}
					</Command.Viewport>
				</Command.List>

				<div class="border-t border-border-primary bg-muted/30 px-4 py-2">
					<div class="flex items-center gap-4 text-xs text-text-secondary">
						<span>↑↓ Navigate</span>
						<span>↵ Select</span>
						<span>ESC Close</span>
					</div>
				</div>
			</Command.Root>
		</div>
	</div>
{/if}
