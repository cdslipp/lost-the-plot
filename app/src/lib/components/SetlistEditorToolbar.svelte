<script lang="ts">
	import { getSetlistState } from '$lib/state/setlistEditorState.svelte';
	import CircleBackButton from '$lib/components/CircleBackButton.svelte';
	import { modKey } from '$lib/utils/platform';

	const slState = getSetlistState();

	let shareCopied = $state(false);
	let sharing = $state(false);

	let {
		backHref,
		onAddSong,
		onExportPdf
	}: {
		backHref: string;
		onAddSong: () => void;
		onExportPdf: () => void;
	} = $props();

	async function handleShare() {
		if (sharing) return;
		sharing = true;
		try {
			await slState.flushPositionWrites();
			const url = await slState.getShareUrl();
			await navigator.clipboard.writeText(url);
			shareCopied = true;
			setTimeout(() => (shareCopied = false), 2000);
		} catch (err) {
			console.error('Failed to share:', err);
		} finally {
			sharing = false;
		}
	}
</script>

<div class="mb-2 flex items-start justify-between gap-4 print:hidden">
	<div class="flex min-w-0 flex-1 items-start gap-3">
		<CircleBackButton href={backHref} ariaLabel="Back to band" />
		<div class="min-w-0 flex-1">
			<input
				value={slState.gigName}
				onchange={(e) => slState.updateGigName((e.target as HTMLInputElement).value)}
				onkeydown={(e) => {
					if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
				}}
				class="w-full min-w-0 border-b-2 border-dashed border-border-secondary bg-transparent px-2 py-1 text-3xl font-bold text-text-primary transition-all placeholder:font-normal placeholder:text-text-tertiary hover:border-border-primary focus:border-solid focus:border-stone-500 focus:outline-none"
				style="font-family: Georgia, 'Times New Roman', serif;"
				placeholder="Gig Name"
			/>
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-2">
		<button
			onclick={handleShare}
			disabled={sharing}
			class="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover disabled:opacity-50"
			title={shareCopied ? 'Link copied to clipboard!' : 'Copy share link'}
		>
			{#if sharing}
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-text-secondary border-t-transparent"
				></div>
			{:else if shareCopied}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-4 w-4 text-green-600"
				>
					<path
						fill-rule="evenodd"
						d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-4 w-4"
				>
					<path
						d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .799l6.733 3.365a2.5 2.5 0 11-.671 1.341l-6.733-3.365a2.5 2.5 0 110-3.482l6.733-3.366A2.52 2.52 0 0113 4.5z"
					/>
				</svg>
			{/if}
			{shareCopied ? 'Copied!' : 'Share'}
		</button>

		<button
			onclick={onExportPdf}
			class="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary transition hover:bg-surface-hover"
			title="Export PDF"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-4 w-4"
			>
				<path
					fill-rule="evenodd"
					d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0118 8.653v4.097A2.25 2.25 0 0115.75 15h-.75v.75c0 .966-.784 1.75-1.75 1.75h-6.5A1.75 1.75 0 015 15.75V15h-.75A2.25 2.25 0 012 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.75-.107 1.126-.153V2.75zm1.5 0v3.342a41.08 41.08 0 017 0V2.75a.25.25 0 00-.25-.25h-6.5a.25.25 0 00-.25.25zm-1.543 5.017A42.461 42.461 0 0110 7.5c1.725 0 3.422.116 5.043.267a.712.712 0 01.657.71v4.273a.75.75 0 01-.75.75h-.75v-2.25a.75.75 0 00-.75-.75h-6.5a.75.75 0 00-.75.75v2.25h-.75a.75.75 0 01-.75-.75V8.467c0-.363.275-.667.657-.71zM6.5 13.5v2.25c0 .138.112.25.25.25h6.5a.25.25 0 00.25-.25V13.5h-7z"
					clip-rule="evenodd"
				/>
			</svg>
			PDF
		</button>

		<button
			onclick={onAddSong}
			class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
			title="Add Song ({modKey}K)"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
					clip-rule="evenodd"
				/>
			</svg>
			Add Song
			<span
				class="rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-200 dark:bg-stone-300 dark:text-stone-800"
				>{modKey}K</span
			>
		</button>
	</div>
</div>
