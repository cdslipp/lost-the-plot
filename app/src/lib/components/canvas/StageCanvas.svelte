<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Konva from 'konva';
	import type { StagePlotState } from '$lib/state/stagePlotState.svelte';
	import { getCurrentImageSrc, getZones } from '$lib/utils/canvasUtils';

	let {
		ps,
		viewOnly,
		zoom = $bindable(1),
		panX = $bindable(0),
		panY = $bindable(0),
		selectedItemIds = $bindable([]),
		canvasPixelWidth,
		canvasPixelHeight,
		pxPerFoot,
		isAltPressed,
		isPanning = false,
		spaceHeld = false,
		onContextMenu,
		onBackgroundClick,
		onCanvasClick,
		placingItem = null
	}: {
		ps: StagePlotState;
		viewOnly: boolean;
		zoom: number;
		panX: number;
		panY: number;
		selectedItemIds: number[];
		canvasPixelWidth: number;
		canvasPixelHeight: number;
		pxPerFoot: number;
		isAltPressed: boolean;
		isPanning?: boolean;
		spaceHeld?: boolean;
		onContextMenu?: (item: any, e: MouseEvent) => void;
		onBackgroundClick?: () => void;
		onCanvasClick?: (e: MouseEvent) => void;
		placingItem?: any;
	} = $props();

	let containerEl: HTMLDivElement;
	let stage: Konva.Stage | null = null;
	let bgLayer: Konva.Layer;
	let itemLayer: Konva.Layer;
	let topLayer: Konva.Layer;
	let transformer: Konva.Transformer;
	let selectionRect: Konva.Rect;

	// Selection Box State
	let isSelecting = false;
	let selectionStartX = 0;
	let selectionStartY = 0;
	let placingGhost: Konva.Image | Konva.Rect | Konva.Group | null = null;

	const nodeMap = new Map<number, Konva.Group>();
	const imageCache = new Map<string, HTMLImageElement>();

	function loadImage(src: string): Promise<HTMLImageElement> {
		if (imageCache.has(src)) {
			return Promise.resolve(imageCache.get(src)!);
		}
		return new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = 'Anonymous';
			img.onload = () => {
				imageCache.set(src, img);
				resolve(img);
			};
			img.onerror = () => resolve(img);
			img.src = src;
		});
	}

	onMount(() => {
		stage = new Konva.Stage({
			container: containerEl,
			width: canvasPixelWidth,
			height: canvasPixelHeight,
			draggable: false // Dragging handled by panning
		});

		bgLayer = new Konva.Layer();
		itemLayer = new Konva.Layer();
		topLayer = new Konva.Layer();

		stage.add(bgLayer);
		stage.add(itemLayer);
		stage.add(topLayer);

		if (!viewOnly) {
			transformer = new Konva.Transformer({
				nodes: [],
				keepRatio: true,
				enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
				rotationSnaps: [
					0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270,
					285, 300, 315, 330, 345
				],
				padding: 5
			});

			transformer.on('transformend', (e) => {
				const nodes = transformer.nodes();
				nodes.forEach((node) => {
					const id = parseInt(node.id(), 10);
					const item = ps.items.find((i) => i.id === id);
					if (item) {
						const scaleX = node.scaleX();
						const scaleY = node.scaleY();
						node.scaleX(1);
						node.scaleY(1);

						const newW = item.position.width * scaleX;
						const newH = item.position.height * scaleY;
						const rot = node.rotation();

						const newX = node.x() - (newW / 2) * pxPerFoot;
						const newY = node.y() - (newH / 2) * pxPerFoot;

						item.position.x = newX / pxPerFoot;
						item.position.y = newY / pxPerFoot;
						item.position.width = newW;
						item.position.height = newH;
						item.position.rotation = rot;
					}
				});
				ps.commitChange();
			});

			topLayer.add(transformer);

			selectionRect = new Konva.Rect({
				fill: 'rgba(0,0,255,0.2)',
				stroke: 'blue',
				strokeWidth: 1,
				visible: false
			});
			topLayer.add(selectionRect);

			stage.on('mousedown touchstart', (e) => {
				if (spaceHeld || isPanning || placingItem) return;
				if (e.target !== stage && e.target.name() !== 'bg-grid') return;

				e.evt.preventDefault();
				const pos = stage!.getRelativePointerPosition()!;
				isSelecting = true;
				selectionStartX = pos.x;
				selectionStartY = pos.y;
				selectionRect.visible(true);
				selectionRect.width(0);
				selectionRect.height(0);
				selectionRect.x(pos.x);
				selectionRect.y(pos.y);
			});

			stage.on('mousemove touchmove', (e) => {
				if (!isSelecting) return;
				e.evt.preventDefault();
				const pos = stage!.getRelativePointerPosition()!;
				selectionRect.x(Math.min(pos.x, selectionStartX));
				selectionRect.y(Math.min(pos.y, selectionStartY));
				selectionRect.width(Math.abs(pos.x - selectionStartX));
				selectionRect.height(Math.abs(pos.y - selectionStartY));
				topLayer.batchDraw();
			});

			stage.on('mouseup touchend', (e) => {
				if (!isSelecting) {
					if (!placingItem && (e.target === stage || e.target.name() === 'bg-grid')) {
						onBackgroundClick?.();
					}
					return;
				}
				isSelecting = false;
				if (!selectionRect.visible()) return;
				selectionRect.visible(false);
				topLayer.batchDraw();

				const box = selectionRect.getClientRect();
				if (box.width === 0 || box.height === 0) {
					onBackgroundClick?.();
					return;
				}

				const selectedIds: number[] = [];
				itemLayer.getChildren().forEach((node) => {
					if (Konva.Util.haveIntersection(box, node.getClientRect())) {
						selectedIds.push(parseInt(node.id(), 10));
					}
				});

				selectedItemIds = e.evt.shiftKey
					? [...new Set([...selectedItemIds, ...selectedIds])]
					: selectedIds;
			});

			stage.on('dragstart', (e) => {
				if (viewOnly || placingItem) {
					e.target.stopDrag();
					return;
				}
				const id = parseInt(e.target.id(), 10);
				if (!selectedItemIds.includes(id) && e.target.parent === itemLayer) {
					selectedItemIds = [id];
				}
			});

			stage.on('contextmenu', (e) => {
				e.evt.preventDefault();
				if (viewOnly || placingItem) return;
				if (e.target !== stage && e.target.name() !== 'bg-grid') {
					const id = parseInt(e.target.id(), 10);
					if (!selectedItemIds.includes(id)) {
						selectedItemIds = [id];
					}
					const item = ps.items.find((i) => i.id === id);
					if (item && onContextMenu) {
						onContextMenu(item, e.evt as MouseEvent);
					}
				}
			});

			// Placing item ghost
			stage.on('mousemove', (e) => {
				if (placingItem) {
					const pos = stage!.getRelativePointerPosition()!;
					const rawX = pos.x / pxPerFoot - placingItem.width / 2;
					const rawY = pos.y / pxPerFoot - placingItem.height / 2;
					const snapped = ps.snapToGrid(rawX, rawY, placingItem.width, placingItem.height);

					if (placingGhost) {
						placingGhost.x((snapped.x + placingItem.width / 2) * pxPerFoot);
						placingGhost.y((snapped.y + placingItem.height / 2) * pxPerFoot);
						topLayer.batchDraw();
					}
				}
			});

			stage.on('click', (e) => {
				if (placingItem && onCanvasClick) {
					onCanvasClick(e.evt as MouseEvent);
				}
			});
		}

		return () => {
			stage?.destroy();
		};
	});

	// Placing item Ghost Node
	$effect(() => {
		if (placingItem && topLayer) {
			if (!placingGhost) {
				const w = placingItem.width * pxPerFoot;
				const h = placingItem.height * pxPerFoot;
				if (placingItem.type === 'riser') {
					placingGhost = new Konva.Group({
						width: w,
						height: h,
						offsetX: w / 2,
						offsetY: h / 2,
						opacity: 0.6,
						listening: false
					});
					placingGhost.add(
						new Konva.Rect({
							width: w,
							height: h,
							fill: 'rgba(156, 163, 175, 0.5)',
							stroke: 'rgba(156, 163, 175, 1)',
							strokeWidth: 2,
							cornerRadius: 4,
							dash: [4, 4]
						})
					);
				} else {
					placingGhost = new Konva.Image({
						width: w,
						height: h,
						offsetX: w / 2,
						offsetY: h / 2,
						opacity: 0.6,
						listening: false
					});
					loadImage(placingItem.itemData?.image || '').then((img) => {
						if (placingGhost) (placingGhost as Konva.Image).image(img);
						topLayer.batchDraw();
					});
				}
				topLayer.add(placingGhost);
			}
		} else if (placingGhost && topLayer) {
			placingGhost.destroy();
			placingGhost = null;
			topLayer.batchDraw();
		}
	});

	// Canvas dimensions and Zoom/Pan
	$effect(() => {
		if (!stage) return;
		stage.width(canvasPixelWidth);
		stage.height(canvasPixelHeight);
		stage.scale({ x: zoom, y: zoom });
		stage.position({ x: panX, y: panY });
		// Only disable pointer events on stage if we are dragging the wrapper
		stage.draggable(false); // since panning is handled by the outer wrapper manually for smoother interaction
	});

	// Render Background Grid
	$effect(() => {
		if (!bgLayer) return;
		bgLayer.destroyChildren();

		const w = ps.stageWidth * pxPerFoot;
		const h = ps.stageDepth * pxPerFoot;

		bgLayer.add(
			new Konva.Rect({
				x: 0,
				y: 0,
				width: w,
				height: h,
				fill: document.documentElement.classList.contains('dark') ? '#1f2937' : 'white',
				name: 'bg-grid'
			})
		);

		if (ps.showZones) {
			const zones = getZones(ps.stageWidth, ps.stageDepth);
			zones.forEach((z) => {
				bgLayer.add(
					new Konva.Rect({
						x: z.x * pxPerFoot,
						y: z.y * pxPerFoot,
						width: z.w * pxPerFoot,
						height: z.h * pxPerFoot,
						stroke: document.documentElement.classList.contains('dark')
							? 'rgba(255,255,255,0.1)'
							: 'rgba(0,0,0,0.08)',
						strokeWidth: 1,
						dash: [5, 5],
						name: 'bg-grid'
					})
				);
				bgLayer.add(
					new Konva.Text({
						x: (z.x + z.w / 2) * pxPerFoot - 12,
						y: z.key.startsWith('DS') ? (z.y + z.h) * pxPerFoot - 18 : z.y * pxPerFoot + 4,
						text: z.key,
						fontSize: 10,
						fill: document.documentElement.classList.contains('dark')
							? 'rgba(255,255,255,0.25)'
							: 'rgba(0,0,0,0.25)',
						name: 'bg-grid'
					})
				);
			});
		}

		bgLayer.draw();
	});

	// Render Items
	$effect(() => {
		if (!itemLayer) return;

		const currentIds = new Set(ps.items.map((i) => i.id));
		for (const [id, node] of nodeMap.entries()) {
			if (!currentIds.has(id)) {
				node.destroy();
				nodeMap.delete(id);
			}
		}

		// Draw items ordered by z-index implicitly
		ps.items.forEach((item, index) => {
			let node = nodeMap.get(item.id);

			const w = item.position.width * pxPerFoot;
			const h = item.position.height * pxPerFoot;
			const x = item.position.x * pxPerFoot + w / 2;
			const y = item.position.y * pxPerFoot + h / 2;
			const rot = item.position.rotation ?? 0;
			const isSelected = selectedItemIds.includes(item.id);

			if (!node) {
				node = new Konva.Group({
					id: String(item.id),
					x,
					y,
					offsetX: w / 2,
					offsetY: h / 2,
					width: w,
					height: h,
					rotation: rot,
					draggable: !viewOnly && !placingItem
				});

				if (item.type === 'stageDeck') {
					node.add(
						new Konva.Rect({
							x: 0,
							y: 0,
							width: w,
							height: h,
							fill: '#D4AF37',
							stroke: '#B8860B',
							strokeWidth: 2,
							cornerRadius: 4
						})
					);
					if (w > 60 && h > 40) {
						node.add(
							new Konva.Text({
								x: 0,
								y: h / 2 - 10,
								width: w,
								text: 'STAGE',
								align: 'center',
								fill: '#8B4513',
								opacity: 0.7,
								fontSize: 10,
								fontStyle: 'bold'
							})
						);
						node.add(
							new Konva.Text({
								x: 0,
								y: h / 2 + 4,
								width: w,
								text: item.size?.replace('x', ' × ') || '',
								align: 'center',
								fill: '#8B4513',
								opacity: 0.6,
								fontSize: 8
							})
						);
					}
				} else if (item.type === 'riser') {
					node.add(
						new Konva.Rect({
							x: 0,
							y: 0,
							width: w,
							height: h,
							fill: 'rgba(156, 163, 175, 0.5)',
							stroke: 'rgba(156, 163, 175, 1)',
							strokeWidth: 2,
							cornerRadius: 4
						})
					);
					node.add(
						new Konva.Text({
							x: 4,
							y: h - 12,
							text: `${item.itemData?.riserWidth ?? '?'}' × ${item.itemData?.riserDepth ?? '?'}'`,
							fill: 'rgba(75, 85, 99, 1)',
							fontSize: 8,
							align: 'right',
							width: w - 8
						})
					);
				} else {
					const imgNode = new Konva.Image({ x: 0, y: 0, width: w, height: h, name: 'main-image' });
					node.add(imgNode);
					const src = getCurrentImageSrc(item);
					loadImage(src).then((img) => {
						if (nodeMap.has(item.id)) {
							imgNode.image(img);
							itemLayer.batchDraw();
						}
					});
				}

				if (item.person_id && item.itemData?.item_type === 'person') {
					const person = ps.personsById[item.person_id];
					if (person) {
						const label = new Konva.Label({ x: w / 2, y: -20, opacity: 0.95 });
						label.add(
							new Konva.Tag({
								fill: document.documentElement.classList.contains('dark') ? '#374151' : 'white',
								cornerRadius: 4,
								shadowColor: 'black',
								shadowBlur: 2,
								shadowOpacity: 0.1,
								shadowOffsetY: 1
							})
						);
						label.add(
							new Konva.Text({
								text: person.name,
								fontSize: 10,
								padding: 4,
								fill: document.documentElement.classList.contains('dark') ? 'white' : '#1f2937',
								fontStyle: 'bold'
							})
						);
						label.offsetX(label.width() / 2);
						node.add(label);
					}
				}

				node.on('dragend', (e) => {
					const newX = e.target.x() - w / 2;
					const newY = e.target.y() - h / 2;
					item.position.x = newX / pxPerFoot;
					item.position.y = newY / pxPerFoot;

					if (ps.snapping) {
						const snapped = ps.snapToGrid(
							item.position.x,
							item.position.y,
							item.position.width,
							item.position.height
						);
						item.position.x = snapped.x;
						item.position.y = snapped.y;
						e.target.x(snapped.x * pxPerFoot + w / 2);
						e.target.y(snapped.y * pxPerFoot + h / 2);
					}

					ps.commitChange();
				});

				nodeMap.set(item.id, node);
				itemLayer.add(node);
			} else {
				node.x(x);
				node.y(y);
				node.width(w);
				node.height(h);
				node.rotation(rot);
				node.draggable(!viewOnly && !placingItem);

				// Update size of internal nodes
				if (item.type === 'stageDeck') {
					const rect = node.children[0] as Konva.Rect;
					rect.width(w);
					rect.height(h);
				} else if (item.type === 'riser') {
					const rect = node.children[0] as Konva.Rect;
					const text = node.children[1] as Konva.Text;
					rect.width(w);
					rect.height(h);
					text.y(h - 12);
					text.width(w - 8);
				} else {
					const imgNode = node.children.find((c) => c.name() === 'main-image') as Konva.Image;
					if (imgNode) {
						imgNode.width(w);
						imgNode.height(h);
					}
				}

				// Update person label position if exists
				const labelNode = node.children.find((c) => c instanceof Konva.Label) as Konva.Label;
				if (labelNode) {
					labelNode.x(w / 2);
					labelNode.offsetX(labelNode.width() / 2);
				}

				node.zIndex(index); // Match DOM z-index order
			}
		});

		itemLayer.batchDraw();
	});

	// Sync transformer selection
	$effect(() => {
		if (!transformer) return;
		const selectedNodes = selectedItemIds
			.map((id) => nodeMap.get(id))
			.filter(Boolean) as Konva.Group[];
		transformer.nodes(selectedNodes);
		topLayer.batchDraw();
	});

	export function getCanvasDataURL() {
		if (!stage) return '';
		const oldScale = stage.scale();
		const oldPos = stage.position();
		const oldWidth = stage.width();
		const oldHeight = stage.height();

		// temporarily reset view for PDF capture
		const exportWidth = ps.stageWidth * pxPerFoot;
		const exportHeight = ps.stageDepth * pxPerFoot;

		stage.width(exportWidth);
		stage.height(exportHeight);
		stage.scale({ x: 1, y: 1 });
		stage.position({ x: 0, y: 0 });

		if (transformer) transformer.nodes([]);
		topLayer.batchDraw();

		const dataURL = stage.toDataURL({ pixelRatio: 4 });

		stage.width(oldWidth);
		stage.height(oldHeight);
		stage.scale(oldScale);
		stage.position(oldPos);

		if (transformer) {
			const selectedNodes = selectedItemIds
				.map((id) => nodeMap.get(id))
				.filter(Boolean) as Konva.Group[];
			transformer.nodes(selectedNodes);
		}
		topLayer.batchDraw();

		return dataURL;
	}
</script>

<div bind:this={containerEl} class="h-full w-full outline-none"></div>
