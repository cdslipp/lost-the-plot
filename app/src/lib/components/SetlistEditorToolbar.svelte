<script lang="ts">
	import { browser } from '$app/environment';
	import { getSetlistState } from '$lib/state/setlistEditorState.svelte';
	import CircleBackButton from '$lib/components/CircleBackButton.svelte';

	const slState = getSetlistState();

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	const modKey = isMac ? '⌘' : 'Ctrl+';

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

	const fontLabels = ['Sans', 'Serif', 'Marker'];
	const pageSizeLabels = ['Letter', 'A4'];

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

<div class="toolbar print:hidden">
	<div class="toolbar-left">
		<CircleBackButton href={backHref} ariaLabel="Back to band" />
		<div class="toolbar-divider"></div>
		<span class="toolbar-gig-name">{slState.gigName}</span>
	</div>

	<div class="toolbar-center">
		<!-- Font toggle -->
		<div class="toolbar-group">
			{#each fontLabels as label, i}
				<button
					class="toolbar-toggle"
					class:active={slState.font === i}
					onclick={() => (slState.font = i)}
					title="Font: {label}"
				>
					{label}
				</button>
			{/each}
		</div>

		<div class="toolbar-divider"></div>

		<!-- Page size toggle -->
		<div class="toolbar-group">
			{#each pageSizeLabels as label, i}
				<button
					class="toolbar-toggle"
					class:active={slState.pageSize === i}
					onclick={() => (slState.pageSize = i)}
					title="Page size: {label}"
				>
					{label}
				</button>
			{/each}
		</div>

		<div class="toolbar-divider"></div>

		<!-- Show keys toggle -->
		<label class="toolbar-checkbox">
			<input type="checkbox" bind:checked={slState.showKeys} />
			<span>Keys</span>
		</label>

		<!-- Show numbers toggle -->
		<label class="toolbar-checkbox">
			<input type="checkbox" bind:checked={slState.showNumbers} />
			<span>Numbers</span>
		</label>
	</div>

	<div class="toolbar-right">
		<button
			class="toolbar-btn toolbar-btn-primary"
			onclick={onAddSong}
			title="Add song ({modKey}K)"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-4 w-4"
			>
				<path
					d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
				/>
			</svg>
			<span class="hidden sm:inline">Add Song</span>
			<kbd class="toolbar-kbd hidden md:inline-block">{modKey}K</kbd>
		</button>

		<div class="toolbar-divider"></div>

		<button class="toolbar-btn" onclick={handleShare} disabled={sharing} title="Share setlist">
			{#if shareCopied}
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
				<span class="text-green-600">Copied!</span>
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
				<span class="hidden sm:inline">Share</span>
			{/if}
		</button>

		<button class="toolbar-btn" onclick={onExportPdf} title="Export PDF">
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
			<span class="hidden sm:inline">PDF</span>
		</button>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--color-border-primary, #e5e5e5);
		background: var(--color-surface, #fff);
		flex-wrap: wrap;
	}

	.toolbar-left,
	.toolbar-center,
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toolbar-gig-name {
		font-weight: 600;
		font-size: 14px;
		color: var(--color-text-primary, #1c1917);
	}

	.toolbar-divider {
		width: 1px;
		height: 20px;
		background: var(--color-border-primary, #e5e5e5);
	}

	.toolbar-group {
		display: flex;
		border: 1px solid var(--color-border-primary, #e5e5e5);
		border-radius: 6px;
		overflow: hidden;
	}

	.toolbar-toggle {
		all: unset;
		cursor: pointer;
		padding: 4px 10px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary, #78716c);
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.toolbar-toggle:hover {
		background: var(--color-surface-hover, #f5f5f4);
	}

	.toolbar-toggle.active {
		background: var(--color-text-primary, #1c1917);
		color: white;
	}

	:global(.dark) .toolbar-toggle.active {
		background: var(--color-surface-hover, #292524);
		color: var(--color-text-primary, #fafaf9);
	}

	.toolbar-checkbox {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-secondary, #78716c);
		cursor: pointer;
	}

	.toolbar-checkbox input {
		cursor: pointer;
	}

	.toolbar-btn {
		all: unset;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-secondary, #78716c);
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.toolbar-btn:hover {
		background: var(--color-surface-hover, #f5f5f4);
		color: var(--color-text-primary, #1c1917);
	}

	.toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toolbar-btn-primary {
		background: var(--color-text-primary, #1c1917);
		color: white;
	}

	.toolbar-btn-primary:hover {
		opacity: 0.9;
		color: white;
	}

	:global(.dark) .toolbar-btn-primary {
		background: var(--color-surface-hover, #292524);
		color: var(--color-text-primary, #fafaf9);
	}

	.toolbar-kbd {
		font-size: 10px;
		padding: 1px 5px;
		border: 1px solid rgb(255 255 255 / 0.3);
		border-radius: 3px;
		opacity: 0.7;
	}
</style>
