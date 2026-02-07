<script lang="ts">
	import { APP_NAME, GITHUB_RELEASES } from '$lib/config';
	import { changelog } from '$lib/data/changelog';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Changelog - {APP_NAME}</title>
</svelte:head>

<div class="relative z-10">
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Changelog</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				What's new, what's fixed, and what's changed.
			</p>
		</div>
	</section>

	<SketchyLine />

	<section class="px-6 py-16">
		<div class="mx-auto max-w-2xl">
			{#each changelog as entry, i (entry.version)}
				{#if i > 0}
					<SketchyLine />
				{/if}

				<div class={i > 0 ? 'mt-12' : ''}>
					<div class="flex items-baseline justify-between gap-4">
						<h2 class="text-2xl font-bold">v{entry.version}</h2>
						<time
							datetime={entry.date}
							class="font-sans text-sm text-stone-400 dark:text-stone-500"
						>
							{new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
					</div>

					<p class="mt-2 font-sans text-sm text-stone-500 dark:text-stone-400">
						{entry.summary}
					</p>

					{#if entry.added?.length}
						<div class="mt-6">
							<span
								class="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 font-sans text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
								>Added</span
							>
							<ul class="mt-3 space-y-2">
								{#each entry.added as item (item)}
									<li
										class="flex items-start gap-2 font-sans text-sm text-stone-600 dark:text-stone-300"
									>
										<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"></span>
										{item}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if entry.changed?.length}
						<div class="mt-6">
							<span
								class="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 font-sans text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
								>Changed</span
							>
							<ul class="mt-3 space-y-2">
								{#each entry.changed as item (item)}
									<li
										class="flex items-start gap-2 font-sans text-sm text-stone-600 dark:text-stone-300"
									>
										<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"></span>
										{item}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if entry.fixed?.length}
						<div class="mt-6">
							<span
								class="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 font-sans text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
								>Fixed</span
							>
							<ul class="mt-3 space-y-2">
								{#each entry.fixed as item (item)}
									<li
										class="flex items-start gap-2 font-sans text-sm text-stone-600 dark:text-stone-300"
									>
										<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400"></span>
										{item}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<a
						href="{GITHUB_RELEASES}/tag/v{entry.version}"
						class="mt-6 inline-flex items-center gap-1 font-sans text-sm text-stone-400 transition hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
					>
						View on GitHub
						<svg
							class="h-3.5 w-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M7 17L17 7M17 7H7M17 7v10" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</a>
				</div>
			{/each}
		</div>
	</section>

	<Footer />
</div>
