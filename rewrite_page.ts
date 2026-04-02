import fs from 'fs';

const filePath = 'app/src/routes/bands/[bandId]/plots/[plotId]/+page.svelte';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
content = content.replace(
  "import CanvasOverlay from '$lib/components/CanvasOverlay.svelte';",
  "import StageCanvas from '$lib/components/canvas/StageCanvas.svelte';"
);

// Remove unused imports
content = content.replace("import Selecto from 'selecto';\n", "");
content = content.replace("import StageDeck from '$lib/components/StageDeck.svelte';\n", "");
content = content.replace("import { ContextMenu } from 'bits-ui';\n", "");

// 2. Remove Selecto and dragging state
content = content.replace(/let selecto: any;\n.*?\nlet justSelected = false;/s, 'let justSelected = false;');
content = content.replace(/let dragging = \$state<{.*?\} \| null>\(null\);/s, '');
content = content.replace(/let rotating = \$state<{.*?\} \| null>\(null\);/s, '');

// 3. Remove dragging handlers
content = content.replace(/function handleRotationStart.*?function handleRotationEnd\(\) \{.*?\}/s, '');
content = content.replace(/function handleItemPointerDown.*?function handleItemPointerUp\(event: PointerEvent\) \{.*?\}/s, '');

// 4. Remove Canvas interaction handlers (now in StageCanvas)
content = content.replace(/function handleCanvasMouseMove.*?function openItemEditor.*?\{.*?\}/s, '');

// 5. Remove Selecto lifecycle
content = content.replace(/\/\/ --- Selecto lifecycle ---\n\s*\$effect\(\(\) => \{.*?\}\);\n/s, '');

// 6. Rewrite canvasContent snippet
const snippetRegex = /\{#snippet canvasContent\(\)\}.*?\{\/snippet\}/s;

const newSnippet = `{#snippet canvasContent()}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={canvasWrapperEl}
			class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white dark:bg-gray-800"
			onwheel={handleWheel}
			onpointerdown={handlePanPointerDown}
			onpointermove={handlePanPointerMove}
			onpointerup={handlePanPointerUp}
			style="cursor: {isPanning ? 'grabbing' : spaceHeld ? 'grab' : 'default'}"
		>
			<div style="width: {canvasPixelWidth}px; height: {canvasPixelHeight}px;" bind:this={canvasEl}>
				<StageCanvas
					{ps}
					{viewOnly}
					bind:zoom
					bind:panX
					bind:panY
					bind:selectedItemIds
					{canvasPixelWidth}
					{canvasPixelHeight}
					{pxPerFoot}
					{isAltPressed}
					{isPanning}
					{spaceHeld}
					{placingItem}
					onContextMenu={(item, e) => {
						// Placeholder for context menu if needed
						// For now we'll just select it
						if (!selectedItemIds.includes(item.id)) selectedItemIds = [item.id];
					}}
					onBackgroundClick={() => clearSelections()}
					onCanvasClick={() => {
						if (placingItem) {
							// Item placement logic is now inside StageCanvas dragend or we do it here.
							// Actually, let's keep placing logic here, but adapted.
							const rawX = (stageCanvasRef?.getStage()?.getRelativePointerPosition()?.x || 0) / pxPerFoot - placingItem.width / 2;
							const rawY = (stageCanvasRef?.getStage()?.getRelativePointerPosition()?.y || 0) / pxPerFoot - placingItem.height / 2;
							const snapped = ps.snapToGrid(rawX, rawY, placingItem.width, placingItem.height);

							const newItem: any = {
								id: Date.now(),
								type: placingItem.type,
								itemData: placingItem.itemData,
								currentVariant: 'default',
								position: {
									width: placingItem.width,
									height: placingItem.height,
									x: Math.max(0, Math.min(snapped.x, ps.stageWidth - placingItem.width)),
									y: Math.max(0, Math.min(snapped.y, ps.stageDepth - placingItem.height))
								},
								name: placingItem.itemData?.name || '',
								person_id: placingItem.person_id ?? null,
								rotation: 0
							};

							ps.items.push(newItem);

							const ch = placingItem.channel;
							if (ch != null) {
								ps.assignItemToChannel(newItem.id, ch);
							}

							const isMonitor = ps.isMonitorItem(placingItem.itemData);
							const defaultInputs = isMonitor ? null : placingItem.itemData?.default_inputs;
							if (defaultInputs && Array.isArray(defaultInputs)) {
								defaultInputs.forEach((inputDef: any, idx: number) => {
									const defItem: any = {
										id: Date.now() + idx + 1,
										type: 'input',
										itemData: {
											...inputDef,
											item_type: 'input',
											name: inputDef.name,
											category: 'Input',
											path: ''
										},
										name: inputDef.name,
										person_id: null,
										currentVariant: 'default',
										position: { width: 0, height: 0, x: 0, y: 0 }
									};
									ps.items.push(defItem);
									if (inputDef.ch) {
										ps.assignItemToChannel(defItem.id, inputDef.ch);
									}
								});
							}

							ps.addDefaultOutputs(placingItem.itemData, newItem.id);
							ps.autoNumberItems();
							placingItem = null;
							ps.commitChange();
						}
					}}
				/>
			</div>

			<!-- Zoom controls -->
			{#if !viewOnly}
				<div class="absolute right-2 bottom-2 z-30 flex items-center gap-1 rounded-lg border border-gray-300 bg-white/90 px-1 py-0.5 shadow-sm backdrop-blur-sm dark:border-gray-600 dark:bg-gray-800/90">
					<button type="button" onclick={() => zoomTo(zoom / 1.2)} class="flex h-6 w-6 items-center justify-center rounded text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" title="Zoom out">&minus;</button>
					<button type="button" onclick={resetView} class="min-w-[3rem] rounded px-1 text-center text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" title="Reset zoom & pan">{Math.round(zoom * 100)}%</button>
					<button type="button" onclick={() => zoomTo(zoom * 1.2)} class="flex h-6 w-6 items-center justify-center rounded text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" title="Zoom in">+</button>
					<div class="mx-0.5 h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
					<button type="button" onclick={() => { panX = 0; panY = 0; }} class="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" title="Re-center canvas">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
							<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
						</svg>
					</button>
				</div>
			{/if}
		</div>
	{/snippet}`;

content = content.replace(snippetRegex, newSnippet);

// 7. Update PDF export
const pdfRegex = /async function handleExportPdf\(\) \{.*?\}/s;
const newPdf = `async function handleExportPdf() {
		if (!stageCanvasRef) return;
		// Build items list from inputChannels with assigned items
		const pdfItems = ps.inputChannels
			.filter((ch) => ch.itemId != null)
			.map((ch) => {
				const item = ps.itemByChannel.get(ch.channelNum);
				return {
					name: item?.name ?? '',
					channel: String(ch.channelNum),
					person_name: item?.person_id ? ps.personsById[item.person_id]?.name || '' : ''
				};
			});
		
		// Get canvas data url directly from StageCanvas component
		const dataUrl = stageCanvasRef.getCanvasDataURL();
		
		await exportToPdf({
			plotName: ps.plotName,
			canvasDataUrl: dataUrl,
			items: pdfItems,
			persons: ps.plotPersons.map((p) => ({ name: p.name, role: p.role || '' })),
			pageFormat: ps.pdfPageFormat
		});
	}`;
content = content.replace(pdfRegex, newPdf);

// 8. Add let stageCanvasRef;
content = content.replace('let canvasEl = $state<HTMLElement | null>(null);', 'let canvasEl = $state<HTMLElement | null>(null);\n\tlet stageCanvasRef: ReturnType<typeof StageCanvas>;');

content = content.replace('<StageCanvas', '<StageCanvas bind:this={stageCanvasRef}');

fs.writeFileSync(filePath, content);
