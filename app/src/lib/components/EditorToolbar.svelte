<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { ImportExport } from '$lib';
	import CircleBackButton from '$lib/components/CircleBackButton.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import {
		encodePayload,
		buildShareUrl,
		buildCatalogIndex
	} from '@stageplotter/shared/share-codec';

	import { generateX32Scn, downloadScnFile, type ScnChannelData } from '$lib/utils/scnGenerator';
	import { browser } from '$app/environment';
	import { getPlotState } from '$lib/state/stagePlotState.svelte';

	const ps = getPlotState();

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	const modKey = isMac ? '⌘' : 'Ctrl+';

	let nameInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (autoFocusName && nameInput) {
			setTimeout(() => {
				nameInput?.focus();
				nameInput?.select();
			}, 100);
		}
	});

	let exporting = $state(false);
	let sharing = $state(false);
	let shareCopied = $state(false);
	let editingDate = $state(false);
	let showShareError = $state(false);

	let {
		onAddItem,
		onImportComplete,
		onExportPdf,
		backHref,
		viewOnly = false,
		autoFocusName = false
	}: {
		onAddItem: () => void;
		onImportComplete: () => void;
		onExportPdf?: () => Promise<void>;
		backHref?: string;
		viewOnly?: boolean;
		autoFocusName?: boolean;
	} = $props();

	async function handleExportPdf() {
		if (!onExportPdf || exporting) return;
		exporting = true;
		try {
			await onExportPdf();
		} finally {
			exporting = false;
		}
	}

	function handleExportScn() {
		const channels: ScnChannelData[] = [];
		for (const ch of ps.inputChannels) {
			if (ch.itemId != null) {
				const item = ps.itemByChannel.get(ch.channelNum);
				if (item) {
					channels.push({
						channel: ch.channelNum,
						name: item.name || '',
						colorId: ch.color ?? undefined
					});
				}
			}
		}

		const scnContent = generateX32Scn({
			sceneName: ps.plotName || 'Untitled',
			channels,
			channelColors: ps.channelColors ?? {},
			stereoLinks: ps.stereoLinks ?? [],
			maxChannels: 32
		});

		const filename = `${(ps.plotName || 'scene').replace(/[^a-zA-Z0-9_-]/g, '_')}.scn`;
		downloadScnFile(scnContent, filename);
	}

	async function handleShare() {
		if (sharing) return;
		sharing = true;
		try {
			const resp = await fetch('/final_assets/items.json');
			const catalog: { path: string }[] = await resp.json();
			const catalogIndex = buildCatalogIndex(catalog);

			const musicians = ps.plotPersons.map((p) => ({
				id: p.id,
				name: p.name,
				instrument: p.role || ''
			}));

			const payload = await encodePayload(
				{
					stageWidth: ps.stageWidth,
					stageDepth: ps.stageDepth,
					items: ps.items.map((item) => ({
						...item,
						channel: String(ps.channelByItemId.get(item.id) ?? '')
					})) as any[],
					musicians,
					persons: ps.bandPersonsFull.map((p) => ({
						name: p.name,
						role: p.role ?? undefined,
						pronouns: p.pronouns ?? undefined,
						phone: p.phone ?? undefined,
						email: p.email ?? undefined,
						member_type: p.member_type ?? undefined,
						status: p.status ?? undefined
					}))
				},
				catalogIndex
			);

			const url = buildShareUrl(window.location.origin, ps.bandName, ps.plotName, payload);

			await navigator.clipboard.writeText(url);
			shareCopied = true;
			setTimeout(() => (shareCopied = false), 3000);
		} catch (e) {
			console.error('Share failed:', e);
			showShareError = true;
		} finally {
			sharing = false;
		}
	}
</script>

<div class="mb-2 flex items-start justify-between gap-4">
	<div class="flex min-w-0 flex-1 items-start gap-3">
		{#if backHref}
			<CircleBackButton href={backHref} />
		{/if}
		<div class="min-w-0 flex-1">
			{#if viewOnly}
				<div class="px-2 py-1 font-serif text-3xl font-bold text-text-primary">
					{ps.plotName || 'Untitled Plot'}
				</div>
			{:else}
				<input
					bind:value={ps.plotName}
					oninput={() => ps.debouncedWrite()}
					onkeydown={(e) => {
						if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
					}}
					bind:this={nameInput}
					class="w-full min-w-0 border-b-2 border-dashed border-border-secondary bg-transparent px-2 py-1 font-serif text-3xl font-bold text-text-primary transition-all placeholder:font-normal placeholder:text-text-tertiary hover:border-border-primary focus:border-solid focus:border-stone-500 focus:outline-none"
					placeholder="Plot Name"
				/>
			{/if}
			{#if editingDate && !viewOnly}
				<input
					type="date"
					value={(() => {
						try {
							return new Date(ps.revisionDate).toISOString().split('T')[0];
						} catch {
							return new Date().toISOString().split('T')[0];
						}
					})()}
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						ps.revisionDate = target.value;
						ps.debouncedWrite();
						editingDate = false;
					}}
					onblur={() => (editingDate = false)}
					class="mt-0.5 ml-2 rounded border border-border-primary bg-surface px-1.5 py-0.5 text-[11px] text-text-tertiary focus:border-stone-500 focus:outline-none"
				/>
			{:else}
				<button
					type="button"
					onclick={() => !viewOnly && (editingDate = true)}
					class="mt-0.5 px-2 text-[11px] font-medium text-text-tertiary transition-colors {viewOnly
						? ''
						: 'cursor-pointer hover:text-text-secondary'}"
				>
					Revised: {(() => {
						try {
							return new Date(ps.revisionDate).toISOString().split('T')[0];
						} catch {
							return ps.revisionDate;
						}
					})()}
				</button>
			{/if}
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
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
					/>
				</svg>
			{/if}
			{shareCopied ? 'Copied!' : 'Share'}
		</button>
		<ImportExport
			{onImportComplete}
			onExportPdf={handleExportPdf}
			onExportScn={handleExportScn}
			hideImport={viewOnly}
		/>
		{#if !viewOnly}
			<button
				onclick={onAddItem}
				class="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				title="Add Item ({modKey}K)"
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
				Add Item
				<span
					class="rounded bg-stone-700 px-1.5 py-0.5 text-xs text-stone-200 dark:bg-stone-300 dark:text-stone-800"
					>{modKey}K</span
				>
			</button>
		{/if}
	</div>
</div>

<NotificationDialog
	bind:open={showShareError}
	title="Share Failed"
	description="Failed to generate share link. Please try again."
	variant="error"
/>
