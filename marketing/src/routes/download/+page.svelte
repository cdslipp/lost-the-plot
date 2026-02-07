<script lang="ts">
	import { onMount } from 'svelte';
	import { APP_NAME, APP_URL, APP_VERSION, LEMON_SQUEEZY_CHECKOUT_URL } from '$lib/config';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Checkmark from '$lib/components/Checkmark.svelte';
	import Footer from '$lib/components/Footer.svelte';

	type Platform = 'mac' | 'windows' | 'linux' | null;

	let detectedPlatform: Platform = $state(null);
	let expandedPlatform: Platform = $state(null);

	const platforms = [
		{
			id: 'mac' as const,
			name: 'macOS',
			icon: '&#63743;',
			format: '.dmg',
			requirements: 'macOS 11 (Big Sur) or later',
			instructions: [
				'Open the downloaded .dmg file',
				'Drag Lost the Plot to the Applications folder',
				'Launch from Applications or Spotlight'
			]
		},
		{
			id: 'windows' as const,
			name: 'Windows',
			icon: '&#xEDA1;',
			format: '.msi',
			requirements: 'Windows 10 or later',
			instructions: [
				'Run the downloaded .msi installer',
				'Follow the installation wizard',
				'Launch from the Start menu'
			]
		},
		{
			id: 'linux' as const,
			name: 'Linux',
			icon: '&#x1F427;',
			format: '.AppImage',
			requirements: 'Ubuntu 20.04+, Fedora 36+, or equivalent',
			instructions: [
				'Make the AppImage executable: chmod +x LostThePlot.AppImage',
				'Run it: ./LostThePlot.AppImage',
				'Or integrate with AppImageLauncher for desktop shortcuts'
			]
		}
	];

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('mac')) {
			detectedPlatform = 'mac';
		} else if (ua.includes('win')) {
			detectedPlatform = 'windows';
		} else if (ua.includes('linux')) {
			detectedPlatform = 'linux';
		}
	});

	function toggleInstructions(id: Platform) {
		expandedPlatform = expandedPlatform === id ? null : id;
	}
</script>

<svelte:head>
	<title>Download - {APP_NAME}</title>
</svelte:head>

<div class="relative z-10">
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
				Download {APP_NAME}
			</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				Native desktop app for macOS, Windows, and Linux. One-time purchase, lifetime updates.
			</p>
			<p class="mt-2 font-sans text-sm text-stone-400 dark:text-stone-500">
				Current version: {APP_VERSION}
			</p>
		</div>
	</section>

	<SketchyLine />

	<!-- Platform cards -->
	<section class="px-6 py-16">
		<div class="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
			{#each platforms as platform (platform.id)}
				<div
					class="rounded-xl bg-white p-6 shadow-sm transition {detectedPlatform === platform.id
						? 'ring-2 ring-stone-900 dark:ring-stone-100'
						: ''} dark:bg-stone-900"
				>
					{#if detectedPlatform === platform.id}
						<div class="mb-4 font-sans text-xs font-medium text-stone-400 dark:text-stone-500">
							Detected
						</div>
					{/if}

					<div class="text-center">
						<div class="text-3xl" aria-hidden="true">
							{#if platform.id === 'mac'}
								<!-- Apple icon -->
								<svg class="mx-auto h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
									<path
										d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"
									/>
								</svg>
							{:else if platform.id === 'windows'}
								<!-- Windows icon -->
								<svg class="mx-auto h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
									<path
										d="M3 12V6.5l8-1.1V12H3zm0 .5h8v6.6l-8-1.1V12.5zm9 0h9V21l-9-1.3V12.5zm0-.5V4l9-1.3v9.3h-9z"
									/>
								</svg>
							{:else}
								<!-- Linux/Tux icon -->
								<svg class="mx-auto h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
									<path
										d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.296 1.884 1.296.409 0 .852-.131 1.236-.397.79-.554 1.31-1.67 1.24-2.621-.03-.377-.146-.734-.354-1.002-.464-.6-1.143-.64-1.477-1.262-.164-.303-.172-.7-.154-1.075.287-.665.523-1.267.494-2.195-.031-.47-.157-.893-.373-1.264a3.158 3.158 0 01-.103-.185c.213-1.204.216-2.474-.154-3.633-.535-1.673-1.418-3.193-2.354-4.165C15.86.807 14.786 0 13.46 0h-.956z"
									/>
								</svg>
							{/if}
						</div>
						<h2 class="mt-3 text-lg font-bold">{platform.name}</h2>
						<p class="mt-1 font-sans text-sm text-stone-400 dark:text-stone-500">
							{platform.format}
						</p>
						<p class="mt-1 font-sans text-xs text-stone-400 dark:text-stone-500">
							{platform.requirements}
						</p>
					</div>

					<a
						href={LEMON_SQUEEZY_CHECKOUT_URL}
						class="lemonsqueezy-button mt-6 block rounded-lg bg-stone-900 px-4 py-2.5 text-center font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Buy &amp; Download &mdash; $25 CAD
					</a>

					<button
						onclick={() => toggleInstructions(platform.id)}
						class="mt-3 w-full font-sans text-xs text-stone-400 transition hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
					>
						{expandedPlatform === platform.id ? 'Hide' : 'Installation'} instructions
					</button>

					{#if expandedPlatform === platform.id}
						<ol class="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
							{#each platform.instructions as step, i (step)}
								<li class="flex gap-2 font-sans text-xs text-stone-500 dark:text-stone-400">
									<span class="shrink-0 font-medium text-stone-400 dark:text-stone-500"
										>{i + 1}.</span
									>
									{step}
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<SketchyLine />

	<!-- What's included -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-2xl">
			<h2 class="text-center text-2xl font-bold tracking-tight">What you get</h2>
			<SketchyLineShort />
			<ul class="mt-8 space-y-3">
				{#each ['Everything in the free browser version', 'Native desktop app (macOS, Windows, Linux)', 'Faster startup and performance', 'File system integration', 'Lifetime updates — pay once, get every future version', 'Support ongoing development'] as benefit (benefit)}
					<li class="flex items-start gap-3 font-sans text-sm text-stone-600 dark:text-stone-300">
						<Checkmark />
						{benefit}
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<SketchyLine />

	<!-- Already purchased -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="text-xl font-bold">Already purchased?</h2>
			<p class="mt-3 font-sans text-sm text-stone-500 dark:text-stone-400">
				Check your email for the license key and download link from Lemon Squeezy. You can also
				re-download from your
				<a
					href="https://app.lemonsqueezy.com/my-orders"
					class="underline transition hover:text-stone-800 dark:hover:text-stone-200"
					>order history</a
				>.
			</p>
		</div>
	</section>

	<SketchyLine />

	<!-- Free alternative -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="text-xl font-bold">Or use the free browser version</h2>
			<SketchyLineShort />
			<p class="mt-4 font-sans text-sm text-stone-500 dark:text-stone-400">
				The browser version has every feature. It's free, works offline, and requires no install.
			</p>
			<a
				href={APP_URL}
				class="mt-6 inline-flex items-center rounded-lg border-2 border-stone-200 px-6 py-3 font-sans text-sm font-medium transition hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-stone-600 dark:hover:bg-stone-800"
			>
				Open {APP_NAME}
			</a>
		</div>
	</section>

	<Footer />
</div>
