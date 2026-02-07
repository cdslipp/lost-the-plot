<script lang="ts">
	import { APP_NAME, APP_URL } from '$lib/config';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Checkmark from '$lib/components/Checkmark.svelte';
	import Footer from '$lib/components/Footer.svelte';

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

<div class="relative z-10">
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Pricing</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				Use it for free in your browser. Buy the app if you want a native experience.
			</p>
		</div>
	</section>

	<SketchyLine />

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

				<SketchyLineShort />

				<div class="mt-6">
					<div class="flex items-baseline gap-1">
						<span class="text-4xl font-bold">$0</span>
					</div>
					<p class="mt-1 font-sans text-xs text-stone-400 dark:text-stone-500">Forever</p>
				</div>

				<ul class="mt-8 space-y-3">
					{#each freeBenefits as benefit (benefit)}
						<li class="flex items-start gap-3 font-sans text-sm text-stone-600 dark:text-stone-300">
							<Checkmark />
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

				<SketchyLineShort />

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
							<Checkmark />
							{benefit}
						</li>
					{/each}
				</ul>

				<a
					href="/download"
					class="mt-8 block rounded-lg bg-stone-900 px-6 py-3 text-center font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Buy {APP_NAME}
				</a>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- FAQ-ish -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-2xl">
			<h2 class="text-center text-2xl font-bold tracking-tight">Common questions</h2>
			<SketchyLineShort />
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

	<Footer />
</div>
