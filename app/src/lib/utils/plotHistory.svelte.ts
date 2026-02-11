const MAX_HISTORY = 50;

export interface PlotSnapshot {
	items: any[];
	inputChannels: any[];
	outputChannels: any[];
	outputs: any[];
}

export class PlotHistory {
	log = $state<{ snapshot: PlotSnapshot; timestamp: number }[]>([]);
	#redoStack = $state<PlotSnapshot[]>([]);
	#pointer = $state(-1);
	#recording = false;
	#getSnapshot: () => PlotSnapshot;
	#applySnapshot: (s: PlotSnapshot) => void;
	#onWrite: () => void;

	get redoStack() {
		return this.#redoStack;
	}
	get canUndo() {
		return this.#pointer > 0;
	}
	get canRedo() {
		return this.#redoStack.length > 0;
	}

	constructor(
		getSnapshot: () => PlotSnapshot,
		applySnapshot: (s: PlotSnapshot) => void,
		onWrite: () => void
	) {
		this.#getSnapshot = getSnapshot;
		this.#applySnapshot = applySnapshot;
		this.#onWrite = onWrite;
	}

	startRecording(
		savedLog?: { snapshot: PlotSnapshot; timestamp: number }[],
		savedRedoStack?: PlotSnapshot[]
	) {
		if (savedLog?.length) {
			// Detect old format: if the first snapshot is an array (old items-only format), discard
			const first = savedLog[0].snapshot;
			if (Array.isArray(first)) {
				// Old format — start fresh
				this.log = [{ snapshot: this.#getSnapshot(), timestamp: Date.now() }];
				this.#pointer = 0;
				this.#redoStack = [];
				this.#recording = true;
				return;
			}
			this.log = savedLog;
			this.#pointer = savedLog.length - 1;
		} else {
			// Seed with current state
			this.log = [{ snapshot: this.#getSnapshot(), timestamp: Date.now() }];
			this.#pointer = 0;
		}
		// Old redo stacks are incompatible if they contain arrays
		if (savedRedoStack?.length && !Array.isArray(savedRedoStack[0])) {
			this.#redoStack = savedRedoStack;
		} else {
			this.#redoStack = [];
		}
		this.#recording = true;
	}

	record() {
		if (!this.#recording) return;
		const snapshot = this.#getSnapshot();
		// Trim any forward entries if we recorded after undoing
		this.log = this.log.slice(0, this.#pointer + 1);
		this.log.push({ snapshot, timestamp: Date.now() });
		// Cap at MAX_HISTORY
		if (this.log.length > MAX_HISTORY) {
			this.log = this.log.slice(this.log.length - MAX_HISTORY);
		}
		this.#pointer = this.log.length - 1;
		this.#redoStack = [];
	}

	undo() {
		if (!this.canUndo) return;
		// Push current state onto redo stack
		this.#redoStack.push(this.#getSnapshot());
		this.#pointer--;
		const entry = this.log[this.#pointer];
		this.#applySnapshot(structuredClone(entry.snapshot));
		this.#onWrite();
	}

	redo() {
		if (!this.canRedo) return;
		const snapshot = this.#redoStack.pop()!;
		this.#pointer++;
		// Update log pointer entry to match
		if (this.#pointer >= this.log.length) {
			this.log.push({
				snapshot: $state.snapshot(snapshot) as PlotSnapshot,
				timestamp: Date.now()
			});
		}
		this.#applySnapshot(structuredClone(snapshot));
		this.#onWrite();
	}
}
