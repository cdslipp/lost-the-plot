<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import {
		getStandardConfig,
		type CanvasConfig,
		type CanvasDimensions,
		type StageArea
	} from '$lib/utils/canvas';
	import { getPlotState } from '$lib/state/stagePlotState.svelte';

	const ps = getPlotState();

	type StagePlotExport = {
		version: string;
		type: 'stage_plot';
		plot_name: string;
		revision_date: string;
		canvas: CanvasConfig & CanvasDimensions;
		stage: StageArea;
		items: Array<{
			id: number;
			name: string;
			type: string;
			category?: string;
			currentVariant?: string;
			position: {
				x: number;
				y: number;
				width: number;
				height: number;
				zone: string;
				relativeX: number;
				relativeY: number;
			};
			channel: string;
			person_id: number | null;
			itemData: any;
		}>;
		metadata?: any;
	};

	let {
		onImportComplete,
		onExportPdf,
		onExportScn,
		hideImport = false
	}: {
		onImportComplete?: () => void;
		onExportPdf?: () => Promise<void>;
		onExportScn?: () => void;
		hideImport?: boolean;
	} = $props();

	let fileInput: HTMLInputElement;
	let isMenuOpen = $state(false);
	let notification = $state<{
		open: boolean;
		title: string;
		description: string;
		variant: 'success' | 'error';
	}>({ open: false, title: '', description: '', variant: 'success' });

	// Export functionality
	function exportStagePlot() {
		const standardConfig = getStandardConfig();

		const stagePlot: StagePlotExport = {
			version: '1.0.0',
			type: 'stage_plot',
			plot_name: ps.plotName || 'Untitled Stage Plot',
			revision_date: new Date().toISOString().split('T')[0],
			canvas: standardConfig.canvas,
			stage: standardConfig.stage,
			items: ps.items.map((item) => {
				const zone = ps.getItemZone(item);
				const relativePos = ps.getItemPosition(item);

				return {
					id: item.id,
					name: item.name,
					type: item.itemData?.type || item.itemData?.category || 'unknown',
					category: item.itemData?.category || item.itemData?.type,
					currentVariant: item.currentVariant,
					position: {
						x: item.position.x,
						y: item.position.y,
						width: item.position.width,
						height: item.position.height,
						zone: zone,
						relativeX: relativePos.x,
						relativeY: relativePos.y
					},
					channel: String(ps.channelByItemId.get(item.id) ?? ''),
					person_id: item.person_id,
					itemData: item.itemData
				};
			}),
			metadata: {
				exportedAt: new Date().toISOString(),
				exportedBy: 'Stage Plot Creator v1.0.0'
			}
		};

		const dataStr = JSON.stringify(stagePlot, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });

		const link = document.createElement('a');
		link.href = URL.createObjectURL(dataBlob);

		const plotName = ps.plotName || 'stage-plot';
		const safeName = plotName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		const timestamp = new Date().toISOString().split('T')[0];
		link.download = `${safeName}-${timestamp}.json`;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		isMenuOpen = false;
	}

	// Import functionality
	function triggerImport() {
		fileInput.click();
		isMenuOpen = false;
	}

	async function handleExportPdf() {
		if (!onExportPdf) return;
		await onExportPdf();
		isMenuOpen = false;
	}

	function handleExportScn() {
		if (!onExportScn) return;
		onExportScn();
		isMenuOpen = false;
	}

	function handleFileImport(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		if (!file.name.endsWith('.json')) {
			notification = {
				open: true,
				title: 'Invalid File',
				description: 'Please select a JSON file.',
				variant: 'error'
			};
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const jsonData = JSON.parse(e.target?.result as string);

				if (!jsonData.version || !jsonData.type || jsonData.type !== 'stage_plot') {
					throw new Error('Invalid stage plot file format');
				}

				if (jsonData.plot_name) ps.plotName = jsonData.plot_name;
				if (jsonData.revision_date)
					ps.revisionDate = new Date(jsonData.revision_date).toISOString().split('T')[0];

				if (jsonData.items && Array.isArray(jsonData.items)) {
					ps.items = jsonData.items.map((exportedItem: any) => ({
						id: exportedItem.id,
						name: exportedItem.name,
						type: exportedItem.type || 'input',
						person_id: exportedItem.person_id ?? null,
						itemData: exportedItem.itemData,
						currentVariant: exportedItem.currentVariant || 'default',
						position: {
							width: exportedItem.position.width,
							height: exportedItem.position.height,
							x: exportedItem.position.x,
							y: exportedItem.position.y
						}
					}));

					// Rebuild channel assignments from imported data
					for (const ch of ps.inputChannels) {
						ch.itemId = null;
						ch.color = null;
					}
					for (const exportedItem of jsonData.items) {
						const ch = parseInt(exportedItem.channel);
						if (!isNaN(ch) && ch >= 1 && ch <= ps.inputChannels.length) {
							ps.assignItemToChannel(exportedItem.id, ch);
						}
					}
				}

				ps.revisionDate = new Date().toISOString().split('T')[0];

				if (onImportComplete) onImportComplete();

				notification = {
					open: true,
					title: 'Import Successful',
					description: 'Stage plot imported successfully!',
					variant: 'success'
				};
			} catch (error) {
				console.error('Import error:', error);
				notification = {
					open: true,
					title: 'Import Error',
					description: 'Error importing stage plot. Please check the file format.',
					variant: 'error'
				};
			}
		};

		reader.readAsText(file);

		target.value = '';
	}
</script>

<!-- Hidden file input for import -->
<input
	bind:this={fileInput}
	type="file"
	accept=".json"
	onchange={handleFileImport}
	style="display: none"
/>

<DropdownMenu.Root bind:open={isMenuOpen}>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				class="flex items-center gap-2 rounded-lg border border-border-primary px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
				title="Import/Export stage plot"
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
				File
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3 w-3 text-text-secondary"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content
		class="z-50 min-w-[180px] rounded-lg border border-border-primary bg-surface p-1 shadow-lg"
		sideOffset={4}
	>
		<DropdownMenu.Item
			onSelect={exportStagePlot}
			class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
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
			Export Plot
		</DropdownMenu.Item>

		{#if !hideImport}
			<DropdownMenu.Item
				onSelect={triggerImport}
				class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
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
				Import Plot
			</DropdownMenu.Item>
		{/if}

		{#if onExportPdf}
			<DropdownMenu.Item
				onSelect={handleExportPdf}
				class="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
			>
				<div>
					<div>Export PDF</div>
					<div class="text-xs text-text-tertiary">Stage plot + input list</div>
				</div>
			</DropdownMenu.Item>
		{/if}

		{#if onExportScn && ps.consoleType === 'x32'}
			<DropdownMenu.Item
				onSelect={handleExportScn}
				class="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
			>
				<div>
					<div>Export Console Scene</div>
					<div class="text-xs text-text-tertiary">X32 .scn file</div>
				</div>
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>

<NotificationDialog
	bind:open={notification.open}
	title={notification.title}
	description={notification.description}
	variant={notification.variant}
/>
