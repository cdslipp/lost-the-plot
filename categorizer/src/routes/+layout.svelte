<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex h-screen flex-col bg-gray-50">
	<header
		class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2"
	>
		<h1 class="text-lg font-semibold text-gray-900">StagePlotter Categorizer</h1>
		<div class="text-sm text-gray-500">
			<kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">j/k</kbd> navigate
			<kbd class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs">⌘S</kbd> save
			<kbd class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs">⌘Enter</kbd> save + next
		</div>
	</header>
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>
