<script lang="ts">
	import { AlertDialog } from 'bits-ui';

	let {
		open = $bindable(false),
		title,
		description,
		variant = 'default'
	}: {
		open: boolean;
		title: string;
		description: string;
		variant?: 'default' | 'success' | 'error';
	} = $props();

	const iconColor = $derived(
		variant === 'success'
			? 'text-green-600 dark:text-green-400'
			: variant === 'error'
				? 'text-red-600 dark:text-red-400'
				: 'text-text-primary'
	);
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
		<AlertDialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-primary bg-surface p-6 shadow-xl"
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					open = false;
				}
			}}
		>
			<div class="flex items-start gap-3">
				{#if variant === 'success'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mt-0.5 h-5 w-5 shrink-0 {iconColor}"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else if variant === 'error'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mt-0.5 h-5 w-5 shrink-0 {iconColor}"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
				<div>
					<AlertDialog.Title class="font-serif text-xl font-semibold text-text-primary">
						{title}
					</AlertDialog.Title>
					<AlertDialog.Description class="mt-2 text-sm text-text-secondary">
						{description}
					</AlertDialog.Description>
				</div>
			</div>
			<div class="mt-6 flex justify-end">
				<AlertDialog.Action
					class="flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					OK
					<kbd
						class="rounded bg-stone-700 px-1.5 py-0.5 text-[10px] font-medium text-stone-200 dark:bg-stone-300 dark:text-stone-800"
						>&#x23CE;</kbd
					>
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
