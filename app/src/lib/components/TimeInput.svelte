<script lang="ts">
	import { parseUserTime, formatTimeMs, formatDurationMs } from '$lib/utils/time';

	type Props = {
		time: number | null;
		onsubmit: (ms: number) => void;
		onpreview?: (ms: number | null) => void;
		placeholder?: string;
		use24h?: boolean;
		disabled?: boolean;
		class?: string;
		isDuration?: boolean;
	};

	let {
		time,
		onsubmit,
		onpreview,
		placeholder = 'HH:MM',
		use24h = true,
		disabled = false,
		class: className = '',
		isDuration = false
	}: Props = $props();

	function formatValue(ms: number | null): string {
		if (isDuration) return formatDurationMs(ms);
		return formatTimeMs(ms, use24h);
	}

	// Formatted value derived from the time prop
	let formattedValue = $derived(formatValue(time));

	// Local editing state — only non-null while the input is focused
	let editingValue = $state<string | null>(null);

	// The value shown in the input
	let displayValue = $derived(editingValue ?? formattedValue);

	function handleFocus(e: FocusEvent) {
		editingValue = formattedValue;
		(e.target as HTMLInputElement).select();
	}

	function handleInput(e: Event) {
		editingValue = (e.target as HTMLInputElement).value;
		if (onpreview) {
			const parsed = parseUserTime(editingValue);
			onpreview(parsed);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			(e.target as HTMLInputElement).blur();
		} else if (e.key === 'Escape') {
			editingValue = null;
			(e.target as HTMLInputElement).blur();
		}
	}

	function handleBlur() {
		if (editingValue !== null) {
			const parsed = parseUserTime(editingValue);
			if (parsed !== null && parsed !== time) {
				onsubmit(parsed);
			}
		}
		editingValue = null;
	}
</script>

<input
	type="text"
	value={displayValue}
	{placeholder}
	{disabled}
	onfocus={handleFocus}
	oninput={handleInput}
	onkeydown={handleKeydown}
	onblur={handleBlur}
	class={className}
/>
