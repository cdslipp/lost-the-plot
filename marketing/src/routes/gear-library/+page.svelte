<script lang="ts">
	import { APP_NAME } from '$lib/config';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Gear Library - {APP_NAME}</title>
</svelte:head>

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

	<SketchyLine />

	<!-- Preview grid -->
	<section class="px-6 py-16">
		<div class="mx-auto max-w-4xl">
			<h2 class="text-center text-2xl font-bold tracking-tight">What's included</h2>
			<SketchyLineShort />

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

	<SketchyLine />

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

	<Footer />
</div>
