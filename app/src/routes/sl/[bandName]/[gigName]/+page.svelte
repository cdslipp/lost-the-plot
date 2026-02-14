<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { decodeSetlist, encodeSetlist, buildSetlistShareUrl } from '@stageplotter/shared';
	import SetlistSheet from '$lib/components/SetlistSheet.svelte';
	import type { SetlistShareData } from '@stageplotter/shared';

	let data = $state<SetlistShareData | null>(null);
	let errorMsg = $state<string | null>(null);
	let copyFeedback = $state(false);

	// Display preferences (reactive state)
	let font = $state<0 | 1 | 2>(0); // 0=sans, 1=serif, 2=marker
	let pageSize = $state<0 | 1>(0); // 0=letter, 1=A4
	let showKeys = $state(true);

	const bandName = $derived($page.params.bandName);
	const gigName = $derived($page.params.gigName);

	onMount(async () => {
		const hash = window.location.hash.slice(1);
		if (!hash) {
			errorMsg = 'No setlist data found in URL';
			return;
		}

		try {
			const decoded = await decodeSetlist(hash);
			data = decoded;
			// Populate display prefs from decoded data
			font = (decoded.f ?? 0) as 0 | 1 | 2;
			pageSize = (decoded.p ?? 0) as 0 | 1;
			showKeys = Boolean(decoded.k ?? true);
		} catch (err) {
			console.error('Failed to decode setlist:', err);
			errorMsg = 'Failed to decode setlist data';
		}
	});

	// Update URL hash when display prefs change
	async function updateUrl() {
		if (!data) return;
		try {
			// Convert compact format back to full format for encoding
			const payload = await encodeSetlist({
				sets: data.sets.map((set) => ({
					name: set.n,
					songs: set.s.map(([title, key]) => ({ title, key }))
				})),
				font,
				pageSize,
				showKeys: showKeys ? 1 : 0
			});
			const url = buildSetlistShareUrl(
				window.location.origin,
				bandName || 'Unnamed-Band',
				gigName || 'Untitled-Gig',
				payload
			);
			window.history.replaceState(null, '', url);
		} catch (err) {
			console.error('Failed to update URL:', err);
		}
	}

	// Watchers for display prefs
	$effect(() => {
		if (data) {
			font; // register dependency
			updateUrl();
		}
	});

	$effect(() => {
		if (data) {
			pageSize; // register dependency
			updateUrl();
		}
	});

	$effect(() => {
		if (data) {
			showKeys; // register dependency
			updateUrl();
		}
	});

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copyFeedback = true;
			setTimeout(() => (copyFeedback = false), 2000);
		} catch (err) {
			console.error('Failed to copy link:', err);
		}
	}

	function print() {
		window.print();
	}
</script>

<svelte:head>
	<title>{gigName} Setlists - {bandName}</title>
</svelte:head>

<div class="container">
	{#if errorMsg}
		<div class="error">
			<p>{errorMsg}</p>
		</div>
	{:else if !data}
		<div class="loading">
			<p>Loading setlists...</p>
		</div>
	{:else}
		<div class="controls no-print">
			<div class="control-group">
				<label>Font:</label>
				<button class:active={font === 0} onclick={() => (font = 0)}>Sans</button>
				<button class:active={font === 1} onclick={() => (font = 1)}>Serif</button>
				<button class:active={font === 2} onclick={() => (font = 2)}>Marker</button>
			</div>

			<div class="control-group">
				<label>Page:</label>
				<button class:active={pageSize === 0} onclick={() => (pageSize = 0)}>Letter</button>
				<button class:active={pageSize === 1} onclick={() => (pageSize = 1)}>A4</button>
			</div>

			<div class="control-group">
				<label>
					<input type="checkbox" bind:checked={showKeys} />
					Show Keys
				</label>
			</div>

			<div class="actions">
				<button onclick={copyLink} class="btn-primary">
					{copyFeedback ? '✓ Copied!' : 'Copy Link'}
				</button>
				<button onclick={print} class="btn-secondary">Print</button>
			</div>
		</div>

		<div class="sheets">
			{#each data.sets as set}
				<SetlistSheet songs={set.s} setName={set.n} {font} {pageSize} {showKeys} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.container {
		min-height: 100vh;
		background: #f5f5f5;
		padding: 2rem 1rem;
	}

	.error,
	.loading {
		max-width: 600px;
		margin: 4rem auto;
		padding: 2rem;
		background: white;
		border-radius: 8px;
		text-align: center;
	}

	.controls {
		max-width: 900px;
		margin: 0 auto 2rem;
		padding: 1.5rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		align-items: center;
	}

	.control-group {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.control-group label {
		font-weight: 500;
		margin-right: 0.5rem;
	}

	.control-group button {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.control-group button:hover {
		background: #f5f5f5;
	}

	.control-group button.active {
		background: #2563eb;
		color: white;
		border-color: #2563eb;
	}

	.actions {
		margin-left: auto;
		display: flex;
		gap: 0.5rem;
	}

	button.btn-primary,
	button.btn-secondary {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	button.btn-primary {
		background: #2563eb;
		color: white;
	}

	button.btn-primary:hover {
		background: #1d4ed8;
	}

	button.btn-secondary {
		background: #6b7280;
		color: white;
	}

	button.btn-secondary:hover {
		background: #4b5563;
	}

	.sheets {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		align-items: center;
	}

	/* Print styles */
	@media print {
		.container {
			background: white;
			padding: 0;
		}

		.no-print {
			display: none !important;
		}

		.sheets {
			gap: 0;
		}

		.sheets :global(.setlist-sheet) {
			page-break-after: always;
		}

		.sheets :global(.setlist-sheet:last-child) {
			page-break-after: auto;
		}
	}
</style>
