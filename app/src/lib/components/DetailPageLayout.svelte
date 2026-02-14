<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleBackButton from '$lib/components/CircleBackButton.svelte';

	type Props = {
		backHref: string;
		backLabel: string;
		name: string;
		editing: boolean;
		nameInput?: string;
		loading: boolean;
		onsave: () => void;
		oncancel: () => void;
		onedit: () => void;
		children: Snippet;
	};

	let {
		backHref,
		backLabel,
		name,
		editing = $bindable(false),
		nameInput = $bindable(''),
		loading,
		onsave,
		oncancel,
		onedit,
		children
	}: Props = $props();
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && editing) oncancel();
	}}
/>

{#if loading}
	<div class="flex flex-1 items-center justify-center">
		<p class="text-text-secondary">Loading...</p>
	</div>
{:else}
	<div class="flex flex-col gap-6">
		<!-- Header: Back + Editable Name -->
		<div class="flex items-center gap-3">
			<CircleBackButton href={backHref} ariaLabel={backLabel} />
			{#if editing}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						onsave();
					}}
					class="flex flex-1 items-center gap-2"
				>
					<input
						bind:value={nameInput}
						onfocus={(e) => (e.target as HTMLInputElement).select()}
						class="w-full border-b-2 border-dashed border-border-secondary bg-transparent px-2 py-1 font-serif text-3xl font-bold text-text-primary focus:border-stone-500 focus:outline-none"
						autofocus
					/>
					<button
						type="submit"
						class="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Save
					</button>
					<button
						type="button"
						onclick={oncancel}
						class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
					>
						Cancel
					</button>
				</form>
			{:else}
				<button
					onclick={onedit}
					class="group/name flex items-center gap-2 text-left font-serif text-3xl font-bold text-text-primary transition hover:text-stone-600"
				>
					<span class="border-b border-dashed border-transparent group-hover/name:border-stone-400"
						>{name}</span
					>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-text-tertiary opacity-0 transition group-hover/name:opacity-100"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<hr class="border-border-primary" />

		{@render children()}
	</div>
{/if}
