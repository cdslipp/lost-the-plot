<script lang="ts">
	import { APP_NAME, APP_URL } from '$lib/config';

	let scrollY = $state(0);

	const features = [
		{
			title: 'Drag-and-Drop Stage Layout',
			description:
				'Place instruments, amps, monitors, and mics on a zoned stage canvas. Resize, rotate, and label everything.',
			image: '/images/marshall.png'
		},
		{
			title: 'Input List',
			description:
				'Auto-generated input list from your stage items. Tracks channel numbers, input types, and assignments.',
			image: '/images/mic.png'
		},
		{
			title: 'Patch Sheet',
			description:
				'Generate a patch sheet directly from your plot. Share it with the sound engineer before load-in.',
			image: '/images/keystand.png'
		},
		{
			title: 'Works Offline',
			description:
				'Runs entirely in your browser. Your data stays on your device. No account required.',
			image: '/images/subwoofer.png'
		}
	];

	const decorativeItems: Array<{
		src: string;
		top: number;
		left?: string;
		right?: string;
		rotate: number;
		size: number;
		speed: number;
	}> = [
		// Left side
		{ src: '/images/drumkit.png', top: 80, left: '3%', rotate: -8, size: 130, speed: 0.1 },
		{ src: '/images/tabla.png', top: 280, left: '1%', rotate: -4, size: 75, speed: 0.2 },
		{ src: '/images/fender.png', top: 520, left: '5%', rotate: 3, size: 85, speed: 0.15 },
		{ src: '/images/banjo.png', top: 780, left: '2%', rotate: 6, size: 75, speed: 0.25 },
		{ src: '/images/vox.png', top: 1050, left: '4%', rotate: 4, size: 95, speed: 0.08 },
		{ src: '/images/cello.png', top: 1350, left: '2%', rotate: -3, size: 110, speed: 0.18 },
		{ src: '/images/steelpan.png', top: 1600, left: '6%', rotate: 5, size: 80, speed: 0.28 },
		{ src: '/images/boom57.png', top: 1900, left: '3%', rotate: -6, size: 85, speed: 0.12 },
		{ src: '/images/marshall412.png', top: 2200, left: '4%', rotate: -2, size: 90, speed: 0.22 },
		{ src: '/images/harp.png', top: 2500, left: '1%', rotate: 3, size: 100, speed: 0.08 },
		{ src: '/images/guitaronstand.png', top: 2800, left: '5%', rotate: -4, size: 95, speed: 0.2 },
		{ src: '/images/tambourine.png', top: 3100, left: '3%', rotate: 7, size: 65, speed: 0.3 },
		// Right side
		{ src: '/images/acoustic.png', top: 60, right: '5%', rotate: 15, size: 85, speed: 0.15 },
		{ src: '/images/keytar.png', top: 350, right: '2%', rotate: -5, size: 110, speed: 0.22 },
		{ src: '/images/congas.png', top: 650, right: '4%', rotate: -3, size: 85, speed: 0.08 },
		{ src: '/images/violin.png', top: 900, right: '3%', rotate: 8, size: 80, speed: 0.25 },
		{ src: '/images/lapsteel.png', top: 1200, right: '3%', rotate: -6, size: 110, speed: 0.12 },
		{ src: '/images/ampeg.png', top: 1500, right: '5%', rotate: 4, size: 90, speed: 0.2 },
		{ src: '/images/wireless_mic.png', top: 1750, right: '2%', rotate: -8, size: 75, speed: 0.28 },
		{ src: '/images/tuba.png', top: 2050, right: '4%', rotate: 3, size: 100, speed: 0.1 },
		{ src: '/images/keystand.png', top: 2350, right: '6%', rotate: -5, size: 85, speed: 0.18 },
		{ src: '/images/subwoofer.png', top: 2650, right: '3%', rotate: 2, size: 90, speed: 0.22 },
		{ src: '/images/mic.png', top: 2900, right: '5%', rotate: -7, size: 70, speed: 0.15 },
		{ src: '/images/marshall.png', top: 3200, right: '2%', rotate: 5, size: 85, speed: 0.05 }
	];
</script>

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

<svelte:window bind:scrollY />

<div class="relative overflow-hidden">
	<!-- Decorative scattered instruments (hidden on small screens) -->
	<div
		class="pointer-events-none absolute inset-0 z-0 hidden opacity-[0.12] lg:block dark:opacity-[0.07]"
	>
		{#each decorativeItems as item (item.src)}
			<img
				src={item.src}
				alt=""
				class="absolute select-none"
				style="
				top: {item.top}px;
				{item.left ? `left: ${item.left}` : `right: ${item.right}`};
				width: {item.size}px;
				transform: translateY({(scrollY - item.top) * item.speed}px) rotate({item.rotate}deg);
				will-change: transform;
			"
			/>
		{/each}
	</div>

	<div class="relative z-10">
		<!-- Hero -->
		<section class="px-6 pt-20 pb-16 text-center sm:pt-28">
			<div class="mx-auto max-w-2xl">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
					Stage plots done right
				</h1>
				<p class="mt-6 text-lg leading-relaxed text-stone-500 dark:text-stone-400">
					Professional stage plots and input lists in minutes, from any device. No signup, no
					subscription. Just drag, drop, and share with the crew.
				</p>
				<div class="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
					<a
						href={APP_URL}
						class="inline-flex items-center rounded-lg bg-stone-900 px-6 py-3 font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Start plotting
					</a>
					<a
						href="#features"
						class="inline-flex items-center font-sans text-sm text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
					>
						See how it works
					</a>
				</div>
			</div>

			<!-- Hero image: instrument lineup -->
			<div
				class="mx-auto mt-16 flex max-w-3xl items-end justify-center gap-6 opacity-50 sm:gap-10 dark:opacity-40"
			>
				<img
					src="/images/marshall.png"
					alt="Marshall amp"
					class="h-16 transition-transform hover:-rotate-3 sm:h-20"
				/>
				<img
					src="/images/drumkit.png"
					alt="Drum kit"
					class="h-20 transition-transform hover:rotate-2 sm:h-28"
				/>
				<img
					src="/images/mic.png"
					alt="Microphone"
					class="h-14 transition-transform hover:-rotate-6 sm:h-20"
				/>
				<img
					src="/images/fender.png"
					alt="Fender amp"
					class="h-14 transition-transform hover:rotate-3 sm:h-18"
				/>
				<img
					src="/images/acoustic.png"
					alt="Acoustic guitar"
					class="h-16 transition-transform hover:-rotate-6 sm:h-22"
				/>
				<img
					src="/images/keytar.png"
					alt="Keytar"
					class="h-12 transition-transform hover:rotate-6 sm:h-16"
				/>
			</div>
		</section>

		{@render sketchyLine()}

		<!-- Features -->
		<section id="features" class="px-6 py-20">
			<div class="mx-auto max-w-4xl">
				<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">What you get</h2>
				{@render sketchyLineShort()}
				<div class="mt-12 grid gap-12 sm:grid-cols-2">
					{#each features as feature (feature.title)}
						<div class="flex gap-5">
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800/50"
							>
								<img
									src={feature.image}
									alt=""
									class="h-10 w-10 object-contain opacity-70 dark:opacity-60"
								/>
							</div>
							<div>
								<h3 class="font-bold">{feature.title}</h3>
								<p
									class="mt-2 font-sans text-base leading-relaxed text-stone-500 dark:text-stone-400"
								>
									{feature.description}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		{@render sketchyLine()}

		<!-- How it works -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-3xl">
				<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">Three steps</h2>
				{@render sketchyLineShort()}
				<div class="mt-12 space-y-10">
					<div class="flex items-start gap-6">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 text-lg font-bold text-stone-400 dark:border-stone-700 dark:text-stone-500"
						>
							1
						</div>
						<div>
							<h3 class="text-lg font-bold">Place your gear</h3>
							<p class="mt-1 font-sans text-base text-stone-500 dark:text-stone-400">
								Open the item palette and drop instruments, amps, monitors, and DI boxes onto the
								stage canvas.
							</p>
						</div>
					</div>
					<div class="flex items-start gap-6">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 text-lg font-bold text-stone-400 dark:border-stone-700 dark:text-stone-500"
						>
							2
						</div>
						<div>
							<h3 class="text-lg font-bold">Assign inputs</h3>
							<p class="mt-1 font-sans text-base text-stone-500 dark:text-stone-400">
								Mark items as inputs. Channel numbers, mic types, and stand preferences carry
								through to the input list automatically.
							</p>
						</div>
					</div>
					<div class="flex items-start gap-6">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 text-lg font-bold text-stone-400 dark:border-stone-700 dark:text-stone-500"
						>
							3
						</div>
						<div>
							<h3 class="text-lg font-bold">Share it</h3>
							<p class="mt-1 font-sans text-base text-stone-500 dark:text-stone-400">
								Export or print your stage plot, input list, and patch sheet. Send them to the venue
								ahead of the gig.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		{@render sketchyLine()}

		<!-- Stage Plot Pro callout -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
					Picking up where Stage Plot Pro left off
				</h2>
				{@render sketchyLineShort()}
				<p class="mt-6 text-stone-500 dark:text-stone-400">
					Stage Plot Pro was the go-to for years. It's gone now. {APP_NAME} is built to fill that gap
					-- same idea, modern tools, runs in your browser, and it's free.
				</p>
				<!-- A fun little trio -->
				<div class="mt-8 flex items-end justify-center gap-8 opacity-30 dark:opacity-20">
					<img src="/images/congas.png" alt="" class="h-14 -rotate-3" />
					<img src="/images/tabla.png" alt="" class="h-10 rotate-2" />
					<img src="/images/banjo.png" alt="" class="h-16 -rotate-6" />
				</div>
			</div>
		</section>

		{@render sketchyLine()}

		<!-- Open source callout -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Free and open source</h2>
				{@render sketchyLineShort()}
				<p class="mt-6 text-stone-500 dark:text-stone-400">
					Licensed under AGPL-3.0. No accounts, no subscriptions, no tracking. Your data stays in
					your browser.
				</p>
				<div class="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
					<a
						href={APP_URL}
						class="inline-flex items-center rounded-lg bg-stone-900 px-6 py-3 font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
					>
						Start plotting
					</a>
					<a
						href="https://github.com/cdslipp/stageplotter"
						class="inline-flex items-center font-sans text-sm text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
					>
						View source on GitHub
					</a>
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
					<div class="font-sans text-sm text-stone-400 dark:text-stone-500">{APP_NAME}</div>
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
</div>
