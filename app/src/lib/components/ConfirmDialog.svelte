<script lang="ts">
	import { AlertDialog } from 'bits-ui';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default',
		onconfirm
	}: {
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'default' | 'destructive';
		onconfirm: () => void;
	} = $props();

	function handleConfirm() {
		onconfirm();
		open = false;
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
		<AlertDialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-primary bg-surface p-6 shadow-xl"
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					handleConfirm();
				}
			}}
		>
			<AlertDialog.Title class="font-serif text-xl font-semibold text-text-primary">
				{title}
			</AlertDialog.Title>
			<AlertDialog.Description class="mt-2 text-sm text-text-secondary">
				{description}
			</AlertDialog.Description>
			<div class="mt-6 flex justify-end gap-3">
				<AlertDialog.Cancel
					class="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-surface-hover"
				>
					{cancelLabel}
					<kbd
						class="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary dark:bg-stone-700"
						>Esc</kbd
					>
				</AlertDialog.Cancel>
				<AlertDialog.Action
					class="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition {variant ===
					'destructive'
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200'}"
					onclick={handleConfirm}
				>
					{confirmLabel}
					<kbd
						class="rounded px-1.5 py-0.5 text-[10px] font-medium {variant === 'destructive'
							? 'bg-red-700/60 text-red-100'
							: 'bg-stone-700 text-stone-200 dark:bg-stone-300 dark:text-stone-800'}">&#x23CE;</kbd
					>
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
