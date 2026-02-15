<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { APP_NAME } from '$lib/config';

	const links: { label: string; href: string; external?: boolean }[] = [
		{ label: 'Bands', href: '/bands' },
		{ label: 'Festivals', href: '/festivals' },
		{ label: 'Tours', href: '/tours' },
		{ label: 'Gear', href: '/gear' },
		{ label: 'Settings', href: '/settings' }
	];
</script>

<svelte:head>
	<title>{APP_NAME}</title>
</svelte:head>

<div class="flex h-[calc(100dvh-1.25rem)] flex-col items-center justify-center gap-12">
	<nav class="flex flex-col items-center gap-6">
		{#each links as link}
			<a
				href={link.href}
				target={link.external ? '_blank' : undefined}
				rel={link.external ? 'noopener noreferrer' : undefined}
				class="nav-word font-serif text-[clamp(3rem,10vw,6rem)] leading-none font-bold text-text-primary no-underline"
			>
				<span class="nav-blob"></span>
				{#each link.label.split('') as letter, i}
					<span class="nav-letter" style="transition-delay: {i * 40}ms">{letter}</span>
				{/each}
			</a>
		{/each}
	</nav>
</div>

<style>
	.nav-word {
		display: inline-flex;
		position: relative;
		padding: 0.05em 0.15em;
		cursor: pointer;
	}

	.nav-blob {
		position: absolute;
		inset: -0.05em -0.1em;
		background: #1c1917;
		border-radius: 4px 6px 5px 4px;
		transform: scaleX(0);
		transform-origin: left center;
		opacity: 0;
		transition:
			transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
			opacity 0.2s;
		z-index: 0;
	}

	:global(.dark) .nav-blob {
		background: #fafaf9;
	}

	.nav-word:hover .nav-blob {
		transform: scaleX(1);
		opacity: 1;
	}

	.nav-letter {
		display: inline-block;
		position: relative;
		z-index: 1;
		transition:
			transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
			color 0.2s;
	}

	.nav-word:hover .nav-letter {
		transform: translateY(-0.08em);
		color: #fafaf9;
	}

	:global(.dark) .nav-word:hover .nav-letter {
		color: #1c1917;
	}
</style>
