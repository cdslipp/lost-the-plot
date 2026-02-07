# Component Decomposition Spec

## Status: Planned

The editor page (`/bands/[bandId]/plots/[plotId]/+page.svelte`) has been partially decomposed. This spec covers the full breakdown plan.

## Already Extracted (Phase 1)

- **`EditorToolbar.svelte`** — Title input, import/export, help/theme/zones toggles, add item button
- **`MusicianPanel.svelte`** — Left sidebar with musician list and add form
- **`CanvasOverlay.svelte`** — Grid pattern, zone guidelines, empty state prompt

## Phase 2: Core Canvas Extraction

### `StageCanvas.svelte`

The main interactive canvas area, extracted from the editor page.

**Props:**

- `items: StagePlotItem[]` (bindable) — items on the canvas
- `canvasWidth: number` (bindable)
- `canvasHeight: number` (bindable)
- `placingItem: PlacingItem | null` (bindable)
- `showZones: boolean`

**Events:**

- `onItemsChange()` — notify parent that items array was mutated
- `onItemSelect(item, event)` — item was clicked/selected
- `onSelectionChange(selectedElements)` — selection changed

**Internal state:**

- Selecto instance
- ResizeObserver
- Drag & drop handlers
- Click-to-place logic

### `CanvasItem.svelte`

Individual item rendered on the canvas.

**Props:**

- `item: StagePlotItem`
- `selected: boolean`
- `editing: boolean`

**Events:**

- `onDragStart(event)`
- `onDragEnd(event)`
- `onClick(event)`
- `onDelete()`
- `onDuplicate()`
- `onRotate()`

**Contains:**

- Image or StageDeck rendering
- Rotate button (shown when selected)
- Delete button (shown on hover)
- Context menu (Edit, Duplicate, Delete)

## Phase 3: State Management

### `stage-plot-store.svelte.ts`

Svelte 5 runes-based state class extracted from the page component.

```typescript
class StagePlotStore {
  plot = $state<StagePlotState>({...});

  // Derived
  inputItems = $derived(this.plot.items.filter(i => i.type === 'input'));

  // Actions
  addItem(item: StagePlotItem): void;
  deleteItem(id: number): void;
  duplicateItem(id: number): void;
  updateItemPosition(id: number, x: number, y: number): void;
  updateItemProperty(id: number, key: string, value: any): void;

  // Musicians
  addMusician(name: string, instrument: string): void;
  deleteMusician(id: number): void;

  // Persistence
  async save(): Promise<void>;
  async load(plotId: string): Promise<void>;

  // History
  undo(): void;
  redo(): void;
}
```

This would eliminate the need for passing `write()` calls everywhere and centralize state mutation logic.

## Phase 4: Inspector Decomposition

The current `Inspector.svelte` handles:

1. Document properties (title, last modified)
2. Single item inspection (position, channel, musician)
3. Multi-item inspection (bulk operations)

Consider splitting into:

- `InspectorDocumentProps.svelte` — title, revision date, event info
- `InspectorItemProps.svelte` — single item property editing
- `InspectorBulkProps.svelte` — multi-selection operations

## Migration Strategy

Each phase can be implemented independently. Phase 2 (StageCanvas) is the highest impact — it removes ~300 lines from the page component. Phase 3 (store) provides the cleanest architecture but touches every component.

Recommended order: Phase 2 → Phase 3 → Phase 4
