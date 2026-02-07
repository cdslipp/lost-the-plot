<script lang="ts">
	import { APP_NAME } from '$lib/config';
</script>

<svelte:head>
	<title>Gear Library - {APP_NAME}</title>
</svelte:head>

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

<div class="relative z-10">
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<p
				class="font-sans text-xs font-medium tracking-[0.2em] text-stone-400 uppercase dark:text-stone-500"
			>
				Open database
			</p>
			<h1 class="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Gear Library</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				An open, community-driven database of stage gear -- instruments, amps, microphones,
				monitors, and everything else that goes on a stage plot. Think GDTF, but for stage plotting.
			</p>
		</div>
	</section>

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

	<!-- Preview grid -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-4xl">
			<h2 class="text-center text-2xl font-bold tracking-tight">What's included</h2>
			{@render sketchyLineShort()}

			<div class="mt-12 grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-6">
				{#each [{ src: '/images/marshall.png', name: 'Marshall Amp' }, { src: '/images/fender.png', name: 'Fender Amp' }, { src: '/images/vox.png', name: 'Vox Amp' }, { src: '/images/marshall412.png', name: 'Marshall 4x12' }, { src: '/images/drumkit.png', name: 'Drum Kit' }, { src: '/images/mic.png', name: 'Vocal Mic' }, { src: '/images/acoustic.png', name: 'Acoustic Guitar' }, { src: '/images/banjo.png', name: 'Banjo' }, { src: '/images/keytar.png', name: 'Keytar' }, { src: '/images/keystand.png', name: 'Keyboard Stand' }, { src: '/images/congas.png', name: 'Congas' }, { src: '/images/tabla.png', name: 'Tabla' }, { src: '/images/lapsteel.png', name: 'Lap Steel' }, { src: '/images/subwoofer.png', name: 'Subwoofer' }] as item (item.name)}
					<div class="flex flex-col items-center gap-2 rounded-lg bg-white p-3 dark:bg-stone-900">
						<img src={item.src} alt={item.name} class="h-12 object-contain" />
						<span class="font-sans text-xs text-stone-500 dark:text-stone-400">{item.name}</span>
					</div>
				{/each}
			</div>

			<p class="mt-8 text-center font-sans text-sm text-stone-400 dark:text-stone-500">
				...and hundreds more across amps, guitars, keys, drums, percussion, winds, mics, stagecraft,
				and accessories. Each with multiple angle views.
			</p>
		</div>
	</section>

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

	<!-- What it is -->
	<section class="px-6 py-16">
		<div class="mx-auto grid max-w-3xl gap-10 sm:grid-cols-2">
			<div>
				<h3 class="font-bold">Open format</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Every item is a simple JSON definition with PNG renders at multiple angles. Easy to
					extend, easy to contribute to.
				</p>
			</div>
			<div>
				<h3 class="font-bold">Multi-angle views</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Front, back, left, right, and angled views for each item. Your stage plot shows gear from
					the right perspective.
				</p>
			</div>
			<div>
				<h3 class="font-bold">Community contributions</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Missing something? The library is open source. Add your own gear and submit a pull
					request.
				</p>
			</div>
			<div>
				<h3 class="font-bold">Categorized and searchable</h3>
				<p class="mt-2 font-sans text-base text-stone-500 dark:text-stone-400">
					Instruments, amps, mics, drums, percussion, winds, stagecraft, and more. Find what you
					need fast.
				</p>
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
