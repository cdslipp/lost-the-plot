<script lang="ts">
	import { APP_NAME, APP_URL } from '$lib/config';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Footer from '$lib/components/Footer.svelte';

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
		initialY: number;
		left?: string;
		right?: string;
		rotate: number;
		size: number;
		speed: number;
	}> = [
		// Left side — uniform speed 2.5, spaced 400px apart
		{ src: '/images/drumkit.png', initialY: -50, left: '3%', rotate: -8, size: 130, speed: 2.5 },
		{ src: '/images/tabla.png', initialY: 350, left: '1%', rotate: -4, size: 75, speed: 2.5 },
		{ src: '/images/fender.png', initialY: 750, left: '5%', rotate: 3, size: 85, speed: 2.5 },
		{ src: '/images/banjo.png', initialY: 1150, left: '2%', rotate: 6, size: 75, speed: 2.5 },
		{ src: '/images/vox.png', initialY: 1550, left: '4%', rotate: 4, size: 95, speed: 2.5 },
		{ src: '/images/cello.png', initialY: 1950, left: '2%', rotate: -3, size: 110, speed: 2.5 },
		{ src: '/images/steelpan.png', initialY: 2350, left: '6%', rotate: 5, size: 80, speed: 2.5 },
		{ src: '/images/boom57.png', initialY: 2750, left: '3%', rotate: -6, size: 85, speed: 2.5 },
		{ src: '/images/marshall412.png', initialY: 3150, left: '4%', rotate: -2, size: 90, speed: 2.5 },
		{ src: '/images/harp.png', initialY: 3550, left: '1%', rotate: 3, size: 100, speed: 2.5 },
		{ src: '/images/guitaronstand.png', initialY: 3950, left: '5%', rotate: -4, size: 95, speed: 2.5 },
		{ src: '/images/tambourine.png', initialY: 4350, left: '3%', rotate: 7, size: 65, speed: 2.5 },
		{ src: '/images/drumkit.png', initialY: 4750, left: '2%', rotate: 4, size: 110, speed: 2.5 },
		{ src: '/images/fender.png', initialY: 5150, left: '4%', rotate: -5, size: 90, speed: 2.5 },
		{ src: '/images/cello.png', initialY: 5550, left: '1%', rotate: 2, size: 100, speed: 2.5 },
		{ src: '/images/steelpan.png', initialY: 5950, left: '5%', rotate: -7, size: 85, speed: 2.5 },
		{ src: '/images/banjo.png', initialY: 6350, left: '3%', rotate: 3, size: 80, speed: 2.5 },
		{ src: '/images/boom57.png', initialY: 6750, left: '2%', rotate: -4, size: 90, speed: 2.5 },
		// Right side — uniform speed 3.0, spaced 400px apart, offset 200px from left
		{ src: '/images/acoustic.png', initialY: 150, right: '5%', rotate: 15, size: 85, speed: 3.0 },
		{ src: '/images/keytar.png', initialY: 550, right: '2%', rotate: -5, size: 110, speed: 3.0 },
		{ src: '/images/congas.png', initialY: 950, right: '4%', rotate: -3, size: 85, speed: 3.0 },
		{ src: '/images/violin.png', initialY: 1350, right: '3%', rotate: 8, size: 80, speed: 3.0 },
		{ src: '/images/lapsteel.png', initialY: 1750, right: '3%', rotate: -6, size: 110, speed: 3.0 },
		{ src: '/images/ampeg.png', initialY: 2150, right: '5%', rotate: 4, size: 90, speed: 3.0 },
		{ src: '/images/wireless_mic.png', initialY: 2550, right: '2%', rotate: -8, size: 75, speed: 3.0 },
		{ src: '/images/tuba.png', initialY: 2950, right: '4%', rotate: 3, size: 100, speed: 3.0 },
		{ src: '/images/keystand.png', initialY: 3350, right: '6%', rotate: -5, size: 85, speed: 3.0 },
		{ src: '/images/subwoofer.png', initialY: 3750, right: '3%', rotate: 2, size: 90, speed: 3.0 },
		{ src: '/images/mic.png', initialY: 4150, right: '5%', rotate: -7, size: 70, speed: 3.0 },
		{ src: '/images/marshall.png', initialY: 4550, right: '2%', rotate: 5, size: 85, speed: 3.0 },
		{ src: '/images/acoustic.png', initialY: 4950, right: '4%', rotate: -3, size: 90, speed: 3.0 },
		{ src: '/images/keytar.png', initialY: 5350, right: '3%', rotate: 6, size: 100, speed: 3.0 },
		{ src: '/images/violin.png', initialY: 5750, right: '5%', rotate: -4, size: 85, speed: 3.0 },
		{ src: '/images/tuba.png', initialY: 6150, right: '2%', rotate: 7, size: 95, speed: 3.0 },
		{ src: '/images/congas.png', initialY: 6550, right: '4%', rotate: -6, size: 80, speed: 3.0 },
		{ src: '/images/wireless_mic.png', initialY: 6950, right: '3%', rotate: 3, size: 75, speed: 3.0 }
	];
</script>

<svelte:window bind:scrollY />

<!-- Decorative scattered instruments (hidden on small screens) -->
<div
	class="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden opacity-[0.12] lg:block dark:opacity-[0.07]"
>
	{#each decorativeItems as item, i (i)}
		<img
			src={item.src}
			alt=""
			loading="lazy"
			decoding="async"
			class="absolute select-none"
			style="
				top: 0;
				{item.left ? `left: ${item.left}` : `right: ${item.right}`};
				width: {item.size}px;
				transform: translateY({item.initialY - scrollY * item.speed}px) rotate({item.rotate}deg);
				will-change: transform;
			"
		/>
	{/each}
</div>

<div class="relative z-10 overflow-hidden">
	<div class="relative">
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

		<SketchyLine />

		<!-- Features -->
		<section id="features" class="px-6 py-20">
			<div class="mx-auto max-w-4xl">
				<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">What you get</h2>
				<SketchyLineShort />
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

		<SketchyLine />

		<!-- How it works -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-3xl">
				<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">Three steps</h2>
				<SketchyLineShort />
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

		<SketchyLine />

		<!-- Stage Plot Pro callout -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
					Picking up where Stage Plot Pro left off
				</h2>
				<SketchyLineShort />
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

		<SketchyLine />

		<!-- Open source callout -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Free and open source</h2>
				<SketchyLineShort />
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

		<SketchyLine />

		<!-- Download the app callout -->
		<section class="px-6 py-20">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Want the desktop app?</h2>
				<SketchyLineShort />
				<p class="mt-6 text-stone-500 dark:text-stone-400">
					Same app, native wrapper. Faster startup, file system access, no browser tab. Also free.
				</p>
				<div class="mt-8">
					<a
						href="/download"
						class="inline-flex items-center rounded-lg border-2 border-stone-300 px-6 py-3 font-sans text-sm font-medium transition hover:border-stone-400 hover:bg-stone-100 dark:border-stone-700 dark:hover:border-stone-600 dark:hover:bg-stone-800"
					>
						Download the desktop app
					</a>
				</div>
			</div>
		</section>

		<Footer />
	</div>
</div>
