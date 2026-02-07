<script lang="ts">
	import './layout.css';
	import { APP_NAME } from '$lib/config';
	import { onMount } from 'svelte';

	let { children } = $props();
	let isDark = $state(true);

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
	});

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('sp-theme', isDark ? 'dark' : 'light');
	}
</script>

<svelte:head>
	<title>{APP_NAME} - Stage Plots Done Fast</title>
	<meta
		name="description"
		content="Create professional stage plots and channel lists in minutes. Drag-and-drop layout, input lists, and patch sheets. Free, open source, works on any device."
	/>
</svelte:head>

<div
	class="min-h-screen bg-stone-50 font-serif text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-100"
>
	<!-- Nav -->
	<nav class="relative z-20">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
			<a href="/" class="text-xl font-bold tracking-tight sm:text-2xl">{APP_NAME}</a>
			<div class="flex items-center gap-5">
				<a
					href="/pricing"
					class="font-sans text-sm text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
				>
					Pricing
				</a>
				<a
					href="/gear-library"
					class="font-sans text-sm text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
				>
					Gear Library
				</a>
				<a
					href="https://github.com/cdslipp/stageplotter"
					class="font-sans text-sm text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
				>
					GitHub
				</a>
				<button
					onclick={toggleTheme}
					class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-200 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
					title="Toggle dark mode"
				>
					{#if isDark}
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<circle cx="12" cy="12" r="5" />
							<path
								d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
							/>
						</svg>
					{:else}
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
	</nav>

	{@render children()}
</div>
