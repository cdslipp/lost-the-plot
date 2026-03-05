<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { NAV_LINKS } from '$lib/config';
	import { page } from '$app/stores';
	import { Shader, Aurora } from 'shaders/svelte';

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
	<div class="fixed inset-0 z-40" onkeydown={handleKeydown}>
		<!-- Shader background layer (no transform ancestor → backdrop-filter works immediately) -->
		<div class="absolute inset-0" transition:fade={{ duration: 300 }}>
			<Shader>
				<Aurora
					colorA="#a8a29e"
					colorB="#d6d3d1"
					colorC="#78716c"
					speed={4}
					intensity={40}
					waviness={30}
					height={150}
				/>
			</Shader>
		</div>

		<!-- Semi-transparent scrim so text remains readable -->
		<div class="menu-scrim absolute inset-0" transition:fade={{ duration: 300 }}></div>

		<!-- Nav links slide in independently -->
		<div
			class="relative flex h-full flex-col items-center justify-center gap-6"
			transition:fly={{ y: -window.innerHeight, duration: 300 }}
		>
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
	.menu-scrim {
		background: rgba(250, 250, 249, 0.1);
		backdrop-filter: blur(4px);
	}

	:global(.dark) .menu-scrim {
		background: rgba(28, 25, 23, 0.1);
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
