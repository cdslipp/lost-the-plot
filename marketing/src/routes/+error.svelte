<script lang="ts">
	import { page } from '$app/state';
	import { APP_NAME } from '$lib/config';
</script>

<div class="relative z-10 flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
	<img
		src="/images/drumkit.png"
		alt=""
		class="mb-8 h-32 opacity-20 dark:opacity-15"
		style="transform: rotate(-8deg)"
	/>
	<h1 class="text-6xl font-bold tracking-tight sm:text-8xl">{page.status}</h1>
	<div class="mx-auto my-4 max-w-xs">
		<svg viewBox="0 0 200 8" class="w-full" preserveAspectRatio="none">
			<path
				d="M 20 4 C 50 2, 80 6, 110 3 S 160 5, 180 4"
				fill="none"
				stroke="currentColor"
				stroke-width="1.2"
				class="text-stone-300 dark:text-stone-700"
				stroke-linecap="round"
			/>
		</svg>
	</div>
	<p class="text-lg text-stone-500 dark:text-stone-400">
		{#if page.status === 404}
			Nothing here. Might have wandered offstage.
		{:else}
			Something went wrong.
		{/if}
	</p>
	<a
		href="/"
		class="mt-8 inline-flex items-center rounded-lg bg-stone-900 px-6 py-3 font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
	>
		Back to {APP_NAME}
	</a>
</div>
