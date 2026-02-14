<script lang="ts">
	let {
		onclick,
		disabled = false,
		label = 'Save'
	}: {
		onclick: () => void;
		disabled?: boolean;
		label?: string;
	} = $props();
</script>

<button
	type="button"
	{disabled}
	{onclick}
	class="flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
>
	{label}
	<kbd
		class="rounded bg-stone-700 px-1.5 py-0.5 text-[10px] font-medium text-stone-200 dark:bg-stone-300 dark:text-stone-800"
		>&#x23CE;</kbd
	>
</button>
