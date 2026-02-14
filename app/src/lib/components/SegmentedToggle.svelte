<script lang="ts" generics="T extends string">
	type Props = {
		options: { label: string; value: T }[];
		value: T;
		onchange?: (value: T) => void;
	};

	let { options, value = $bindable(), onchange }: Props = $props();
</script>

<div class="flex rounded-md border border-border-primary text-xs">
	{#each options as option, i (option.value)}
		<button
			onclick={() => {
				value = option.value;
				onchange?.(option.value);
			}}
			class="px-2 py-0.5 transition {value === option.value
				? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
				: 'text-text-secondary hover:bg-surface-hover'}"
			style={i === 0
				? 'border-radius: 0.3rem 0 0 0.3rem;'
				: i === options.length - 1
					? 'border-radius: 0 0.3rem 0.3rem 0;'
					: ''}
		>
			{option.label}
		</button>
	{/each}
</div>
