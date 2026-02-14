<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { FestivalBandFileRow } from '$lib/db/repositories/festivalBandFiles';
	import { readFile } from '$lib/utils/opfsStorage';

	type Props = {
		file: FestivalBandFileRow | null;
		files: FestivalBandFileRow[];
		onclose: () => void;
		onnavigate: (file: FestivalBandFileRow) => void;
		ondownload: (file: FestivalBandFileRow) => void;
	};

	let { file, files, onclose, onnavigate, ondownload }: Props = $props();

	let blobUrl = $state<string | null>(null);
	let loading = $state(false);

	let currentIndex = $derived(file ? files.findIndex((f) => f.id === file!.id) : -1);
	let hasPrev = $derived(currentIndex > 0);
	let hasNext = $derived(currentIndex >= 0 && currentIndex < files.length - 1);
	let isImage = $derived(file?.file_type?.startsWith('image/') ?? false);
	let isPdf = $derived(file?.file_type === 'application/pdf');

	function cleanup() {
		if (blobUrl) {
			URL.revokeObjectURL(blobUrl);
			blobUrl = null;
		}
	}

	$effect(() => {
		if (!file) {
			cleanup();
			return;
		}

		loading = true;
		const currentFile = file;

		readFile(currentFile.file_path).then((data) => {
			if (file?.id !== currentFile.id) return;
			cleanup();
			if (data) {
				const blob = new Blob([data], {
					type: currentFile.file_type ?? 'application/octet-stream'
				});
				blobUrl = URL.createObjectURL(blob);
			}
			loading = false;
		});
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!file) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		} else if (e.key === 'ArrowLeft' && hasPrev) {
			e.preventDefault();
			onnavigate(files[currentIndex - 1]);
		} else if (e.key === 'ArrowRight' && hasNext) {
			e.preventDefault();
			onnavigate(files[currentIndex + 1]);
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function goPrev() {
		if (hasPrev) onnavigate(files[currentIndex - 1]);
	}

	function goNext() {
		if (hasNext) onnavigate(files[currentIndex + 1]);
	}

	onDestroy(cleanup);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if file}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex flex-col bg-black/80" onclick={handleBackdropClick}>
		<!-- Top bar -->
		<div class="flex items-center justify-between px-4 py-3">
			<span class="min-w-0 truncate text-sm text-white">{file.original_filename}</span>
			<div class="flex items-center gap-2">
				<button
					onclick={() => ondownload(file!)}
					class="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
					title="Download"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
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
				<button
					onclick={onclose}
					class="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
					title="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
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

		<!-- Content area -->
		<div class="relative flex flex-1 items-center justify-center overflow-hidden px-12">
			{#if loading}
				<div class="h-16 w-16 animate-pulse rounded-lg bg-white/10"></div>
			{:else if blobUrl && isImage}
				<img
					src={blobUrl}
					alt={file.original_filename}
					class="max-h-[85vh] max-w-[85vw] object-contain"
				/>
			{:else if blobUrl && isPdf}
				<iframe
					src={blobUrl}
					title={file.original_filename}
					class="h-[85vh] w-[85vw] rounded-lg bg-white"
				></iframe>
			{:else}
				<!-- Unsupported file type -->
				<div class="flex flex-col items-center gap-3 text-white/60">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-16 w-16"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
							clip-rule="evenodd"
						/>
					</svg>
					<p class="text-sm">Download to view this file</p>
				</div>
			{/if}

			<!-- Prev/Next arrows -->
			{#if files.length > 1}
				<button
					onclick={goPrev}
					disabled={!hasPrev}
					class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 disabled:opacity-20"
					title="Previous"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
				<button
					onclick={goNext}
					disabled={!hasNext}
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 disabled:opacity-20"
					title="Next"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
