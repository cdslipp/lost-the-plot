<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import {
		getStandardConfig,
		type CanvasConfig,
		type CanvasDimensions,
		type StageArea
	} from '$lib/utils/canvas';
	import type { StagePlotItem } from '@stageplotter/shared';

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
		title = $bindable<string>(''),
		lastModified = $bindable<string>(''),
		items = $bindable<StagePlotItem[]>([]),
		canvasWidth = $bindable<number>(1100),
		canvasHeight = $bindable<number>(850),
		getItemZone = $bindable<((item: StagePlotItem) => string) | undefined>(undefined),
		getItemPosition = $bindable<((item: StagePlotItem) => { x: number; y: number }) | undefined>(
			undefined
		),
		onImportComplete = $bindable<(() => void) | undefined>(undefined),
		onExportPdf = $bindable<(() => Promise<void>) | undefined>(undefined),
		onExportScn = $bindable<(() => void) | undefined>(undefined),
		consoleType = $bindable<string | null>(null)
	} = $props();

	let fileInput: HTMLInputElement;
	let isMenuOpen = $state(false);

	// Export functionality
	function exportStagePlot() {
		// Use standard configuration for consistent layout
		const standardConfig = getStandardConfig();

		const stagePlot: StagePlotExport = {
			version: '1.0.0',
			type: 'stage_plot',
			plot_name: title || 'Untitled Stage Plot',
			revision_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
			canvas: standardConfig.canvas,
			stage: standardConfig.stage,
			items: items.map((item) => {
				const zone = getItemZone ? getItemZone(item) : 'DSC';
				const relativePos = getItemPosition ? getItemPosition(item) : { x: 0, y: 0 };

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
					channel: item.channel,
					person_id: item.person_id,
					itemData: item.itemData
				};
			}),
			metadata: {
				exportedAt: new Date().toISOString(),
				exportedBy: 'Stage Plot Creator v1.0.0'
			}
		};

		// Create and download the file
		const dataStr = JSON.stringify(stagePlot, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });

		const link = document.createElement('a');
		link.href = URL.createObjectURL(dataBlob);

		// Generate filename from plot name or use default
		const plotName = title || 'stage-plot';
		const safeName = plotName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		const timestamp = new Date().toISOString().split('T')[0];
		link.download = `${safeName}-${timestamp}.json`;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Close the menu
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
			alert('Please select a JSON file.');
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const jsonData = JSON.parse(e.target?.result as string);

				// Basic validation
				if (!jsonData.version || !jsonData.type || jsonData.type !== 'stage_plot') {
					throw new Error('Invalid stage plot file format');
				}

				// Load the data
				if (jsonData.plot_name) title = jsonData.plot_name;
				if (jsonData.revision_date)
					lastModified = new Date(jsonData.revision_date).toISOString().split('T')[0];

				// Load canvas dimensions (enforce standard format)
				const standardConfig = getStandardConfig();
				canvasWidth = standardConfig.canvas.width;
				canvasHeight = standardConfig.canvas.height;

				// Load items
				if (jsonData.items && Array.isArray(jsonData.items)) {
					items = jsonData.items.map((exportedItem: any) => ({
						id: exportedItem.id,
						name: exportedItem.name,
						type: exportedItem.type || 'input',
						channel: exportedItem.channel || '',
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
				}

				// Update last modified to now since we just imported
				lastModified = new Date().toISOString().split('T')[0];

				// Notify parent component
				if (onImportComplete) onImportComplete();

				alert('Stage plot imported successfully!');
			} catch (error) {
				console.error('Import error:', error);
				alert('Error importing stage plot. Please check the file format.');
			}
		};

		reader.readAsText(file);

		// Reset file input
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

		{#if onExportScn && consoleType === 'x32'}
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
