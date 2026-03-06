<script lang="ts">
	type Props = {
		checked: boolean;
		onchange: (checked: boolean) => void;
		label: string;
		activeColor?: string;
	};

	let { checked, onchange, label, activeColor = 'bg-stone-900 dark:bg-stone-100' }: Props =
		$props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	onclick={() => onchange(!checked)}
	class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 {checked
		? activeColor
		: 'bg-gray-300 dark:bg-gray-600'}"
>
	<span
		class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 dark:bg-gray-900 {checked
			? 'translate-x-4'
			: 'translate-x-0.5'}"
		style="margin-top: 2px;"
	></span>
</button>
