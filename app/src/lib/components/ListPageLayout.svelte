<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		children: Snippet;
		footer?: Snippet;
	};

	let { title, children, footer }: Props = $props();
</script>

<div class="mx-auto flex h-[calc(100dvh-1.25rem)] max-w-md flex-col gap-6 py-6">
	<div class="flex items-center justify-between">
		<h1 class="font-serif text-3xl font-bold text-text-primary">{title}</h1>
		<a href="/" class="text-sm text-text-tertiary transition hover:text-text-primary">Home</a>
	</div>

	{@render children()}

	{#if footer}
		{@render footer()}
	{/if}
</div>
