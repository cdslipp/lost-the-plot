<script lang="ts">
	type Props = {
		accept?: string;
		multiple?: boolean;
		onfiles: (files: File[]) => void;
	};

	let { accept, multiple = true, onfiles }: Props = $props();

	let dragging = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		const files = Array.from(e.dataTransfer?.files ?? []);
		if (files.length > 0) onfiles(multiple ? files : [files[0]]);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave() {
		dragging = false;
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = Array.from(target.files ?? []);
		if (files.length > 0) onfiles(files);
		target.value = '';
	}
</script>

<div
	class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition {dragging
		? 'border-stone-500 bg-stone-100 dark:bg-stone-800'
		: 'border-border-primary hover:border-stone-400'}"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	onclick={() => inputEl?.click()}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			inputEl?.click();
		}
	}}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-6 w-6 text-text-tertiary"
		viewBox="0 0 20 20"
		fill="currentColor"
	>
		<path
			fill-rule="evenodd"
			d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
			clip-rule="evenodd"
		/>
	</svg>
	<span class="text-sm text-text-secondary">Drop files here or click to browse</span>

	<input
		bind:this={inputEl}
		type="file"
		{accept}
		{multiple}
		onchange={handleInputChange}
		class="hidden"
	/>
</div>
