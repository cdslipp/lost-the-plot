<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { FestivalBandFileRow } from '$lib/db/repositories/festivalBandFiles';
	import {
		generateThumbnail,
		revokeThumbnailUrl,
		type ThumbnailResult
	} from '$lib/utils/thumbnail';

	type Props = {
		file: FestivalBandFileRow;
		onclick: () => void;
		ondownload: () => void;
		ondelete: () => void;
	};

	let { file, onclick, ondownload, ondelete }: Props = $props();

	let thumbnail = $state<ThumbnailResult | null>(null);

	$effect(() => {
		let cancelled = false;
		const prev = thumbnail;

		generateThumbnail(file.file_path, file.file_type).then((result) => {
			if (!cancelled) {
				if (prev) revokeThumbnailUrl(prev);
				thumbnail = result;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		if (thumbnail) revokeThumbnailUrl(thumbnail);
	});
</script>

<div class="flex max-w-[10rem] flex-col overflow-hidden rounded-lg bg-stone-50 dark:bg-stone-900">
	<!-- Thumbnail area -->
	<button
		type="button"
		{onclick}
		class="flex h-28 w-full cursor-pointer items-center justify-center transition hover:opacity-80"
		title="Preview {file.original_filename}"
	>
		{#if !thumbnail}
			<!-- Loading state -->
			<div class="h-20 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-700"></div>
		{:else if thumbnail.type === 'image' || thumbnail.type === 'pdf'}
			<img
				src={thumbnail.url}
				alt={file.original_filename}
				class="max-h-full max-w-full object-contain"
			/>
		{:else}
			<!-- Generic / error icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-12 w-12 text-text-tertiary"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
					clip-rule="evenodd"
				/>
			</svg>
		{/if}
	</button>

	<!-- File info + actions -->
	<div class="flex items-center gap-2 px-3 py-2">
		<span class="min-w-0 flex-1 truncate text-sm text-text-primary">
			{file.original_filename}
		</span>
		<button
			onclick={ondownload}
			class="flex-shrink-0 text-text-secondary hover:text-text-primary"
			title="Download"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
		<button onclick={ondelete} class="flex-shrink-0 text-red-500 hover:text-red-700" title="Delete">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>
</div>
