<script lang="ts">
	import { getContext } from 'svelte';

	const toggleMenu = getContext<() => void>('toggleMenu');
</script>

<!-- Desktop: styled "M" key hint -->
<button
	class="menu-trigger hidden cursor-pointer flex-col items-center gap-1 border-none bg-transparent p-0 sm:flex"
	onclick={toggleMenu}
	aria-label="Open menu"
>
	<kbd
		class="menu-key inline-flex items-center rounded-lg border-2 border-text-primary/40 px-3 py-1.5 font-mono text-sm font-bold text-text-primary/80 shadow-[0_2px_0_2px_rgba(0,0,0,0.15)]"
	>
		M
	</kbd>
	<span class="text-[10px] font-medium tracking-wide text-text-primary/40 uppercase">menu</span>
</button>

<!-- Mobile: hamburger icon -->
<button
	class="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-[5px] border-none bg-transparent p-0 sm:hidden"
	onclick={toggleMenu}
	aria-label="Open menu"
>
	<span class="block h-[2px] w-6 rounded-full bg-text-primary"></span>
	<span class="block h-[2px] w-6 rounded-full bg-text-primary"></span>
	<span class="block h-[2px] w-6 rounded-full bg-text-primary"></span>
</button>

<style>
	.menu-key {
		transition:
			transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.15s ease,
			border-color 0.15s ease;
	}

	.menu-trigger:hover .menu-key {
		transform: translateY(2px);
		box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.15);
		border-color: rgba(0, 0, 0, 0.5);
	}

	:global(.dark) .menu-trigger:hover .menu-key {
		border-color: rgba(255, 255, 255, 0.5);
	}

	.menu-trigger:active .menu-key {
		transform: translateY(3px);
		box-shadow: none;
	}
</style>
