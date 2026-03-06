<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { tick } from 'svelte';
	import { getNavLinks } from '$lib/config';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackgroundShader from './BackgroundShader.svelte';

	let { open = $bindable(false), instrumentSrc = '' }: { open: boolean; instrumentSrc?: string } = $props();

	let navEl: HTMLElement;

	function getLinks(): HTMLAnchorElement[] {
		return navEl ? Array.from(navEl.querySelectorAll<HTMLAnchorElement>('.nav-word')) : [];
	}

	$effect(() => {
		if (open) {
			tick().then(() => {
				getLinks()[0]?.focus();
			});
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			open = false;
			return;
		}

		if (!open) return;

		const links = getLinks();
		const count = links.length;
		const currentIndex = links.findIndex((el) => el === document.activeElement);

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const next = currentIndex < 0 ? 0 : (currentIndex + 1) % count;
			links[next]?.focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			const prev = currentIndex < 0 ? count - 1 : (currentIndex - 1 + count) % count;
			links[prev]?.focus();
		} else if (e.key >= '1' && e.key <= '9') {
			const idx = parseInt(e.key) - 1;
			if (idx < count) {
				e.preventDefault();
				open = false;
				goto(links[idx].href);
			}
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
		<div class="absolute inset-0" transition:fade={{ duration: 150 }}>
			<BackgroundShader />
		</div>

		<!-- Semi-transparent scrim so text remains readable -->
		<div class="menu-scrim absolute inset-0" transition:fade={{ duration: 150 }}></div>

		<!-- Sideways wordmark — matches layout positioning, desktop only -->
		<div
			class="pointer-events-none absolute top-0 left-0 hidden h-full items-end select-none sm:flex"
			aria-hidden="true"
			transition:fade={{ duration: 150 }}
		>
			<div class="flex flex-col items-center pb-8">
				{#if instrumentSrc}
					<img
						src={instrumentSrc}
						alt=""
						class="mb-16 h-20 w-16 object-contain opacity-20 lg:mb-24"
						style="transform: rotate(-8deg);"
					/>
				{/if}
				<span
					class="font-serif text-[clamp(5rem,12vh,10rem)] leading-none font-bold whitespace-nowrap text-text-primary/40"
					style="writing-mode: vertical-lr; transform: rotate(180deg); letter-spacing: 0.05em;"
				>
					Lost the Plot
				</span>
			</div>
		</div>

		<!-- Nav links slide in independently -->
		<div
			class="relative flex h-full flex-col items-center justify-center gap-6"
			transition:fly={{ y: -window.innerHeight, duration: 150 }}
		>
			<!-- Wordmark (mobile only, hidden on desktop where vertical version shows) -->
			<span class="font-serif text-[clamp(1.5rem,4vw,2.5rem)] font-bold text-text-primary/40 sm:hidden">
				Lost the Plot
			</span>

			<nav bind:this={navEl} class="flex flex-col items-center gap-6">
				{#each getNavLinks() as link, i}
					<a
						href={link.href}
						onclick={handleLinkClick}
						class="nav-word font-serif text-[clamp(3rem,10vw,6rem)] leading-none font-bold text-text-primary no-underline"
						aria-current={page.url.pathname.startsWith(link.href) ? 'page' : undefined}
					>
						<span class="number-hint">{i + 1}</span>
						<span class="nav-blob"></span>
						{#each link.label.split('') as letter, j}
							<span class="nav-letter" style="transition-delay: {j * 40}ms">{letter}</span>
						{/each}
					</a>
				{/each}
			</nav>

			<!-- ESC close button -->
			<button
				class="esc-button mt-10 flex cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0"
				onclick={() => (open = false)}
				aria-label="Close menu"
			>
				<kbd
					class="esc-key inline-flex items-center rounded-lg border-2 border-text-primary/40 px-4 py-2 font-mono text-lg font-bold text-text-primary/80 shadow-[0_2px_0_2px_rgba(0,0,0,0.15)]"
				>
					esc
				</kbd>
				<span class="text-xs font-medium tracking-wide text-text-primary/40 uppercase">close</span>
			</button>
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

	.nav-word:hover .nav-blob,
	.nav-word:focus-visible .nav-blob {
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

	.nav-word:hover .nav-letter,
	.nav-word:focus-visible .nav-letter {
		transform: translateY(-0.08em);
		color: #fafaf9;
	}

	:global(.dark) .nav-word:hover .nav-letter,
	:global(.dark) .nav-word:focus-visible .nav-letter {
		color: #1c1917;
	}

	.nav-word:focus-visible {
		outline: none;
	}

	.number-hint {
		position: absolute;
		left: -1.5em;
		top: 50%;
		transform: translateY(-50%);
		font-family: monospace;
		font-size: 0.35em;
		color: rgba(0, 0, 0, 0.3);
		pointer-events: none;
		z-index: 1;
	}

	:global(.dark) .number-hint {
		color: rgba(255, 255, 255, 0.3);
	}

	.esc-key {
		transition:
			transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.15s ease,
			border-color 0.15s ease;
	}

	.esc-button:hover .esc-key {
		transform: translateY(2px);
		box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.15);
		border-color: rgba(0, 0, 0, 0.5);
	}

	:global(.dark) .esc-button:hover .esc-key {
		border-color: rgba(255, 255, 255, 0.5);
	}

	.esc-button:active .esc-key {
		transform: translateY(3px);
		box-shadow: none;
	}
</style>
