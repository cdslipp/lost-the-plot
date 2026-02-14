<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		accept?: string;
		multiple?: boolean;
		onfiles: (files: File[]) => void;
		children?: Snippet;
	};

	let { accept, multiple = true, onfiles, children }: Props = $props();

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
	class="rounded-lg border border-dashed p-4 transition {dragging
		? 'border-stone-500 bg-stone-100 dark:bg-stone-800'
		: 'border-border-primary'}"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	role="region"
	aria-label="File drop area"
>
	<!-- Top bar: prompt + upload button -->
	<div class="flex items-center justify-between gap-2">
		<span class="text-sm text-text-secondary">Drop files here or click Upload</span>
		<button
			type="button"
			onclick={() => inputEl?.click()}
			class="inline-flex items-center gap-1.5 rounded-md border border-border-primary bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition hover:bg-stone-100 dark:hover:bg-stone-800"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
					clip-rule="evenodd"
				/>
			</svg>
			Upload
		</button>
	</div>

	<!-- Children (thumbnails) rendered inside the dropzone -->
	{#if children}
		<div class="mt-3">
			{@render children()}
		</div>
	{/if}

	<input
		bind:this={inputEl}
		type="file"
		{accept}
		{multiple}
		onchange={handleInputChange}
		class="hidden"
	/>
</div>
