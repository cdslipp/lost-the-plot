<script lang="ts">
	import { APP_NAME, APP_URL } from '$lib/config';
	import SketchyLine from '$lib/components/SketchyLine.svelte';
	import SketchyLineShort from '$lib/components/SketchyLineShort.svelte';
	import Checkmark from '$lib/components/Checkmark.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>How It Works - {APP_NAME}</title>
	<meta
		name="description"
		content="Learn how Lost the Plot stores your data locally, works offline, and lets you share stage plots with a single URL — no account or server required."
	/>
</svelte:head>

<div class="relative z-10">
	<!-- Hero -->
	<section class="px-6 pt-16 pb-8 text-center sm:pt-24">
		<div class="mx-auto max-w-2xl">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">How it works</h1>
			<p class="mt-4 text-lg text-stone-500 dark:text-stone-400">
				Your data stays on your device. Sharing is built into the URL. Here's how it all fits
				together.
			</p>
		</div>
	</section>

	<SketchyLine />

	<!-- Local-first storage -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-3xl">
			<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">
				Local storage with SQLite
			</h2>
			<SketchyLineShort />
			<div class="mt-10 space-y-6 font-sans text-base leading-relaxed text-stone-600 dark:text-stone-300">
				<p>
					{APP_NAME} stores everything in a SQLite database in your browser using
					<strong class="text-stone-800 dark:text-stone-100">OPFS</strong> (Origin Private File
					System) — a private storage area that only this app can access.
				</p>
				<p>
					Your bands, plots, musicians, contacts, and input lists all live in this local database.
					Nothing is uploaded to a server. No account needed, no cloud sync.
				</p>
				<p>
					The app also works offline once loaded.
				</p>
			</div>
			<div class="mt-10 rounded-xl border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-900">
				<h3 class="font-bold text-stone-800 dark:text-stone-100">What OPFS means for you</h3>
				<ul class="mt-4 space-y-3">
					{#each ['Data stays on your device — never uploaded', 'No account, no login, no password', 'Works offline after first load', 'Fast — database queries happen locally, not over a network', 'Private by default — your contacts and channel lists are yours'] as item (item)}
						<li class="flex items-start gap-3 font-sans text-sm text-stone-600 dark:text-stone-300">
							<Checkmark />
							{item}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- How sharing works -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-3xl">
			<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">
				Sharing without a server
			</h2>
			<SketchyLineShort />
			<div class="mt-10 space-y-6 font-sans text-base leading-relaxed text-stone-600 dark:text-stone-300">
				<p>
					When you hit <strong class="text-stone-800 dark:text-stone-100">Share</strong>, your
					entire stage plot gets compressed and encoded into the URL itself. The link contains
					everything: item positions, channel assignments, musician names, and contact details.
				</p>
				<p>
					The person you share it with doesn't need the app installed or an account. They just open
					the link and see the full plot — rendered live in their browser from the data in the URL.
				</p>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- Step-by-step encoding -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-3xl">
			<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">
				What happens when you share
			</h2>
			<SketchyLineShort />
			<div class="mt-12 space-y-10">
				<div class="flex items-start gap-6">
					<div
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-stone-300 text-lg font-bold text-stone-400 dark:border-stone-700 dark:text-stone-500"
					>
						1
					</div>
					<div>
						<h3 class="text-lg font-bold">Compact the data</h3>
						<p class="mt-1 font-sans text-base text-stone-500 dark:text-stone-400">
							Each item on your stage plot gets converted from a verbose object into a compact
							numeric tuple. Gear references are replaced with catalog indexes — so instead of
							storing a full path like <code
								class="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm dark:bg-stone-800"
								>amps/guitar/fender_amp</code
							>, it stores a single number.
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
						<h3 class="text-lg font-bold">Compress it</h3>
						<p class="mt-1 font-sans text-base text-stone-500 dark:text-stone-400">
							The compacted JSON is then gzip-compressed using the browser's built-in
							CompressionStream API. This typically reduces the payload by 80% or more.
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
						<h3 class="text-lg font-bold">Encode into the URL</h3>
						<p class="mt-1 font-sans text-base text-stone-500 dark:text-stone-400">
							The compressed bytes are base64url-encoded and placed in the URL's
							<strong class="text-stone-700 dark:text-stone-200">hash fragment</strong>
							— the part after the <code
								class="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm dark:bg-stone-800"
								>#</code
							>. Hash fragments are never sent to the server in HTTP requests, so your data stays
							entirely client-side even when using the link.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- URL anatomy -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-3xl">
			<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">Anatomy of a share link</h2>
			<SketchyLineShort />
			<div class="mt-10 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-900">
				<div class="font-mono text-sm leading-relaxed">
					<span class="text-stone-400 dark:text-stone-500">https://ltp.slipp.cam/s/</span><span
						class="font-bold text-stone-800 dark:text-stone-100">my-band</span
					><span class="text-stone-400 dark:text-stone-500">/</span><span
						class="font-bold text-stone-800 dark:text-stone-100">main-stage</span
					><span class="text-stone-400 dark:text-stone-500">#</span><span
						class="text-stone-500 italic dark:text-stone-400">compressed-plot-data...</span
					>
				</div>
			</div>
			<div class="mt-6 space-y-4">
				<div class="flex items-start gap-4">
					<div class="shrink-0 rounded bg-stone-200 px-2 py-1 font-mono text-xs font-bold dark:bg-stone-800">
						/s/my-band/main-stage
					</div>
					<p class="font-sans text-sm text-stone-500 dark:text-stone-400">
						Human-readable path — shows the band name and plot name in plain text.
					</p>
				</div>
				<div class="flex items-start gap-4">
					<div class="shrink-0 rounded bg-stone-200 px-2 py-1 font-mono text-xs font-bold dark:bg-stone-800">
						#...
					</div>
					<p class="font-sans text-sm text-stone-500 dark:text-stone-400">
						Hash fragment — contains the entire compressed plot. Never sent to any server.
					</p>
				</div>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- Privacy -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-3xl">
			<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">
				Privacy
			</h2>
			<SketchyLineShort />
			<div class="mt-10 space-y-6 font-sans text-base leading-relaxed text-stone-600 dark:text-stone-300">
				<p>
					There's no server storing your data, so there's nothing to leak. The hash fragment
					in the URL is processed entirely by the browser — an intercepted HTTP request would only
					show the band and plot names, not the content.
				</p>
				<p>
					Phone numbers, emails, and other contact details you add to band members are included in
					the compressed payload. They're only visible to someone who has the full share link.
				</p>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- Import -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-3xl">
			<h2 class="text-center text-2xl font-bold tracking-tight sm:text-3xl">
				Receiving a shared plot
			</h2>
			<SketchyLineShort />
			<div class="mt-10 space-y-6 font-sans text-base leading-relaxed text-stone-600 dark:text-stone-300">
				<p>
					When someone opens your share link, they see a read-only view of the stage plot with
					the full canvas layout, input list, musicians, and contacts. No install required.
				</p>
				<p>
					If they want to edit it, they can click <strong class="text-stone-800 dark:text-stone-100"
						>Import to My Plots</strong
					>. This decodes the URL, creates a new band and plot in their local database, and opens it
					in the editor. From that point on, it's their own independent copy.
				</p>
			</div>
		</div>
	</section>

	<SketchyLine />

	<!-- CTA -->
	<section class="px-6 py-20">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Give it a try</h2>
			<SketchyLineShort />
			<p class="mt-6 text-stone-500 dark:text-stone-400">
				No signup or download needed. Open the app and start building your stage plot.
			</p>
			<div class="mt-8">
				<a
					href={APP_URL}
					class="inline-flex items-center rounded-lg bg-stone-900 px-6 py-3 font-sans text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					Start plotting
				</a>
			</div>
		</div>
	</section>

	<Footer />
</div>
