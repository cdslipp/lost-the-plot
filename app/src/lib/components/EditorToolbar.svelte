<script lang="ts">
	// SPDX-License-Identifier: AGPL-3.0-only
	import { ImportExport } from '$lib';
	import {
		encodePayload,
		buildShareUrl,
		buildCatalogIndex
	} from '@stageplotter/shared/share-codec';

	import { generateX32Scn, downloadScnFile, type ScnChannelData } from '$lib/utils/scnGenerator';
	import { browser } from '$app/environment';

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
	const modKey = isMac ? '⌘' : 'Ctrl+';

	let exporting = $state(false);
	let sharing = $state(false);
	let shareCopied = $state(false);
	let editingDate = $state(false);

	let {
		title = $bindable(''),
		revisionDate = $bindable(''),
		onRevisionDateChange,
		onAddItem,
		onImportComplete,
		onTitleChange,
		onExportPdf,
		backHref,
		items = $bindable([]),
		musicians = $bindable([]),
		canvasWidth = $bindable(1100),
		canvasHeight = $bindable(850),
		lastModified = $bindable(''),
		getItemZone,
		getItemPosition,
		bandName = '',
		persons = [],
		stageWidth = 24,
		stageDepth = 16,
		consoleType = null,
		channelColors = {},
		stereoLinks = []
	}: {
		title: string;
		revisionDate: string;
		onRevisionDateChange?: () => void;
		onAddItem: () => void;
		onImportComplete: () => void;
		onTitleChange: () => void;
		onExportPdf?: () => Promise<void>;
		backHref?: string;
		items: any[];
		musicians: any[];
		canvasWidth: number;
		canvasHeight: number;
		lastModified: string;
		getItemZone: (item: any) => string;
		getItemPosition: (item: any) => { x: number; y: number };
		bandName?: string;
		consoleType?: string | null;
		channelColors?: Record<number, string>;
		stereoLinks?: number[];
		persons?: Array<{
			name: string;
			role?: string | null;
			pronouns?: string | null;
			phone?: string | null;
			email?: string | null;
			member_type?: string | null;
			status?: string | null;
		}>;
		stageWidth?: number;
		stageDepth?: number;
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
		// Build channel data from items
		const channels: ScnChannelData[] = items
			.filter((item: any) => item.channel)
			.map((item: any) => ({
				channel: parseInt(item.channel),
				name: item.name || '',
				colorId: channelColors?.[parseInt(item.channel)]
			}));

		const scnContent = generateX32Scn({
			sceneName: title || 'Untitled',
			channels,
			channelColors: channelColors ?? {},
			stereoLinks: stereoLinks ?? [],
			maxChannels: 32
		});

		const filename = `${(title || 'scene').replace(/[^a-zA-Z0-9_-]/g, '_')}.scn`;
		downloadScnFile(scnContent, filename);
	}

	async function handleShare() {
		if (sharing) return;
		sharing = true;
		try {
			// Load the catalog to build the index
			const resp = await fetch('/final_assets/items.json');
			const catalog: { path: string }[] = await resp.json();
			const catalogIndex = buildCatalogIndex(catalog);

			const payload = await encodePayload(
				{
					stageWidth,
					stageDepth,
					items,
					musicians,
					persons: persons.map((p) => ({
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

			const url = buildShareUrl(window.location.origin, bandName, title, payload);

			await navigator.clipboard.writeText(url);
			shareCopied = true;
			setTimeout(() => (shareCopied = false), 3000);
		} catch (e) {
			console.error('Share failed:', e);
			alert('Failed to generate share link. Please try again.');
		} finally {
			sharing = false;
		}
	}
</script>

<div class="mb-2 flex items-start justify-between gap-4">
	<div class="flex min-w-0 flex-1 items-start gap-3">
		{#if backHref}
			<a
				href={backHref}
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-primary text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
				aria-label="Back"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</a>
		{/if}
		<div class="min-w-0 flex-1">
			<input
				bind:value={title}
				oninput={() => onTitleChange()}
				class="w-full min-w-0 border-b-2 border-dashed border-border-secondary bg-transparent px-2 py-1 font-serif text-3xl font-bold text-text-primary transition-all placeholder:font-normal placeholder:text-text-tertiary hover:border-border-primary focus:border-solid focus:border-stone-500 focus:outline-none"
				placeholder="Plot Name"
			/>
			{#if editingDate}
				<input
					type="date"
					value={(() => {
						try {
							return new Date(revisionDate).toISOString().split('T')[0];
						} catch {
							return new Date().toISOString().split('T')[0];
						}
					})()}
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						revisionDate = target.value;
						onRevisionDateChange?.();
						editingDate = false;
					}}
					onblur={() => (editingDate = false)}
					class="mt-0.5 ml-2 rounded border border-border-primary bg-surface px-1.5 py-0.5 text-[11px] text-text-tertiary focus:border-stone-500 focus:outline-none"
				/>
			{:else}
				<button
					type="button"
					onclick={() => (editingDate = true)}
					class="mt-0.5 cursor-pointer px-2 text-[11px] font-medium text-text-tertiary transition-colors hover:text-text-secondary"
				>
					Revised: {(() => {
						try {
							return new Date(revisionDate).toISOString().split('T')[0];
						} catch {
							return revisionDate;
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
			bind:title
			bind:lastModified
			bind:items
			bind:canvasWidth
			bind:canvasHeight
			{getItemZone}
			{getItemPosition}
			{onImportComplete}
			onExportPdf={handleExportPdf}
			onExportScn={handleExportScn}
			{consoleType}
		/>
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
	</div>
</div>
