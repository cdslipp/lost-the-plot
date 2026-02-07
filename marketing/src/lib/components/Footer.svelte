<script lang="ts">
	import { APP_NAME } from '$lib/config';
</script>

<footer class="px-6 pt-4 pb-10">
	<div class="mx-auto max-w-4xl">
		<svg viewBox="0 0 800 8" class="mb-8 w-full" preserveAspectRatio="none">
			<path
				d="M0 4 C 30 2, 70 6, 120 3 S 200 5, 280 4 S 380 2, 440 5 S 540 3, 620 4 S 720 6, 780 3 L 800 4"
				fill="none"
				stroke="currentColor"
				stroke-width="0.8"
				class="text-stone-200 dark:text-stone-800"
				stroke-linecap="round"
			/>
		</svg>
		<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
			<a
				href="/"
				class="font-sans text-sm text-stone-400 transition hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
				>{APP_NAME}</a
			>
			<div class="flex gap-6 font-sans text-sm text-stone-400 dark:text-stone-500">
				<a
					href="https://github.com/cdslipp/stageplotter"
					class="transition hover:text-stone-700 dark:hover:text-stone-300">GitHub</a
				>
				<a
					href="https://github.com/sponsors/cdslipp"
					class="transition hover:text-stone-700 dark:hover:text-stone-300">Sponsor</a
				>
				<a
					href="https://github.com/cdslipp/stageplotter/blob/main/LICENSE"
					class="transition hover:text-stone-700 dark:hover:text-stone-300">License</a
				>
			</div>
		</div>
	</div>
</footer>
