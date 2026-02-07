<script lang="ts">
	import { APP_NAME, APP_URL } from '$lib/config';

	const freeBenefits = [
		'Full stage plot editor',
		'Input list and patch sheet',
		'Works offline (PWA)',
		'All stage gear included',
		'Export and print',
		'No account needed'
	];

	const appBenefits = [
		'Everything in Free',
		'Native desktop app (macOS, Windows, Linux)',
		'Faster performance',
		'File system integration',
		'Lifetime updates',
		'Support development'
	];
</script>

<svelte:head>
	<title>Pricing - {APP_NAME}</title>
</svelte:head>

{#snippet sketchyLine()}
	<div class="mx-auto my-2 max-w-4xl px-6">
		<svg viewBox="0 0 800 12" class="w-full" preserveAspectRatio="none">
			<path
				d="M0 6 C 50 4, 100 8, 150 5 S 250 7, 300 6 S 400 4, 450 7 S 550 5, 600 6 S 700 8, 750 5 L 800 6"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				class="text-stone-300 dark:text-stone-700"
				stroke-linecap="round"
			/>
		</svg>
	</div>
{/snippet}

{#snippet sketchyLineShort()}
	<div class="mx-auto my-1 max-w-xs px-6">
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
{/snippet}

{#snippet checkmark()}
	<svg
		class="mt-0.5 h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="2.5"
		stroke="currentColor"
	>
		<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/snippet}

<div class="relative z-10">
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Pricing</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				Use it for free in your browser. Buy the app if you want a native experience.
			</p>
		</div>
	</section>

	{@render sketchyLine()}

	<!-- Pricing cards -->
	<section class="px-6 py-16">
		<div class="mx-auto grid max-w-3xl gap-8 sm:grid-cols-2">
			<!-- Free tier -->
			<div class="rounded-xl bg-white p-8 shadow-sm dark:bg-stone-900">
				<div class="flex items-end justify-between">
					<div>
						<h2 class="text-xl font-bold">Free</h2>
						<p class="mt-1 font-sans text-sm text-stone-500 dark:text-stone-400">
							Browser-based, no install
						</p>
					</div>
					<img src="/images/mic.png" alt="" class="h-10 opacity-30 dark:opacity-20" />
				</div>

				{@render sketchyLineShort()}

				<div class="mt-6">
					<div class="flex items-baseline gap-1">
						<span class="text-4xl font-bold">$0</span>
					</div>
					<p class="mt-1 font-sans text-xs text-stone-400 dark:text-stone-500">Forever</p>
				</div>

				<ul class="mt-8 space-y-3">
					{#each freeBenefits as benefit (benefit)}
						<li class="flex items-start gap-3 font-sans text-sm text-stone-600 dark:text-stone-300">
							{@render checkmark()}
							{benefit}
						</li>
					{/each}
				</ul>

				<a
					href={APP_URL}
					class="mt-8 block rounded-lg border-2 border-stone-200 px-6 py-3 text-center font-sans text-sm font-medium transition hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-stone-600 dark:hover:bg-stone-800"
				>
					Open {APP_NAME}
				</a>
			</div>

			<!-- App tier -->
			<div
				class="relative rounded-xl bg-white p-8 shadow-sm ring-2 ring-stone-900 dark:bg-stone-900 dark:ring-stone-100"
			>
				<div
					class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-3 py-0.5 font-sans text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900"
				>
					Lifetime
				</div>

				<div class="flex items-end justify-between">
					<div>
						<h2 class="text-xl font-bold">Desktop App</h2>
						<p class="mt-1 font-sans text-sm text-stone-500 dark:text-stone-400">
							macOS, Windows, Linux
						</p>
					</div>
					<img src="/images/marshall.png" alt="" class="h-10 opacity-30 dark:opacity-20" />
				</div>

				{@render sketchyLineShort()}

				<div class="mt-6">
					<div class="flex items-baseline gap-1">
						<span class="text-4xl font-bold">$25</span>
						<span class="font-sans text-sm text-stone-500 dark:text-stone-400">CAD</span>
					</div>
					<p class="mt-1 font-sans text-xs text-stone-400 dark:text-stone-500">
						One-time payment, lifetime updates
					</p>
				</div>

				<ul class="mt-8 space-y-3">
					{#each appBenefits as benefit (benefit)}
						<li class="flex items-start gap-3 font-sans text-sm text-stone-600 dark:text-stone-300">
							{@render checkmark()}
							{benefit}
						</li>
					{/each}
				</ul>

				<a
					href={APP_URL}
					class="mt-8 block rounded-lg bg-stone-900 px-6 py-3 text-center font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Buy {APP_NAME}
				</a>
			</div>
		</div>
	</section>

	{@render sketchyLine()}

	<!-- FAQ-ish -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-2xl">
			<h2 class="text-center text-2xl font-bold tracking-tight">Common questions</h2>
			{@render sketchyLineShort()}
			<div class="mt-10 space-y-8">
				<div>
					<h3 class="font-bold">Is the free version limited?</h3>
					<p class="mt-2 font-sans text-sm text-stone-500 dark:text-stone-400">
						No. The browser version has every feature. The desktop app is the same thing in a native
						wrapper -- faster startup, file system access, no browser tab.
					</p>
				</div>
				<div>
					<h3 class="font-bold">What does "lifetime" mean?</h3>
					<p class="mt-2 font-sans text-sm text-stone-500 dark:text-stone-400">
						Pay once, get every update. No subscriptions, no renewals. If we ship it, you get it.
					</p>
				</div>
				<div>
					<h3 class="font-bold">Can I try before I buy?</h3>
					<p class="mt-2 font-sans text-sm text-stone-500 dark:text-stone-400">
						Use the free browser version. It's the same app. If you like it enough to want the
						desktop version, it's there.
					</p>
				</div>
				<div>
					<h3 class="font-bold">Why $25 CAD?</h3>
					<p class="mt-2 font-sans text-sm text-stone-500 dark:text-stone-400">
						It costs money to build and maintain software. This keeps the project going without ads,
						tracking, or subscription fatigue.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
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
						href="https://github.com/cdslipp/stageplotter/blob/main/LICENSE"
						class="transition hover:text-stone-700 dark:hover:text-stone-300">License</a
					>
				</div>
			</div>
		</div>
	</footer>
</div>
