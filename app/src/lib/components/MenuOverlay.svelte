<script lang="ts">
	import { fly } from 'svelte/transition';
	import { NAV_LINKS } from '$lib/config';
	import { page } from '$app/stores';

	let { open = $bindable(false) }: { open: boolean } = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
		}
	}

	function handleLinkClick() {
		open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="menu-overlay fixed inset-0 z-40 backdrop-blur-2xl"
		transition:fly={{ y: -window.innerHeight, duration: 300 }}
		onkeydown={handleKeydown}
	>
		<div class="flex h-full flex-col items-center justify-center gap-6">
			<nav class="flex flex-col items-center gap-6">
				{#each NAV_LINKS as link}
					<a
						href={link.href}
						onclick={handleLinkClick}
						class="nav-word font-serif text-[clamp(3rem,10vw,6rem)] leading-none font-bold text-text-primary no-underline"
						aria-current={$page.url.pathname.startsWith(link.href) ? 'page' : undefined}
					>
						<span class="nav-blob"></span>
						{#each link.label.split('') as letter, i}
							<span class="nav-letter" style="transition-delay: {i * 40}ms">{letter}</span>
						{/each}
					</a>
				{/each}
			</nav>
		</div>
	</div>
{/if}

<style>
	.menu-overlay {
		background: rgba(250, 250, 249, 0.75);
		background-image:
			radial-gradient(ellipse at 30% 20%, rgba(214, 211, 209, 0.4) 0%, transparent 60%),
			radial-gradient(ellipse at 70% 80%, rgba(231, 229, 228, 0.3) 0%, transparent 50%);
	}

	:global(.dark) .menu-overlay {
		background: rgba(28, 25, 23, 0.75);
		background-image:
			radial-gradient(ellipse at 30% 20%, rgba(68, 64, 60, 0.4) 0%, transparent 60%),
			radial-gradient(ellipse at 70% 80%, rgba(87, 83, 78, 0.25) 0%, transparent 50%);
	}

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
