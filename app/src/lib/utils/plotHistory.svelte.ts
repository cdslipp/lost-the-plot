const MAX_HISTORY = 50;

export class PlotHistory {
	log = $state<{ snapshot: any[]; timestamp: number }[]>([]);
	#redoStack = $state<any[][]>([]);
	#pointer = $state(-1);
	#recording = false;
	#items: any[];
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

	constructor(items: any[], onWrite: () => void) {
		this.#items = items;
		this.#onWrite = onWrite;
	}

	startRecording(savedLog?: { snapshot: any[]; timestamp: number }[], savedRedoStack?: any[][]) {
		if (savedLog?.length) {
			this.log = savedLog;
			this.#pointer = savedLog.length - 1;
		} else {
			// Seed with current state
			this.log = [{ snapshot: $state.snapshot(this.#items) as any[], timestamp: Date.now() }];
			this.#pointer = 0;
		}
		this.#redoStack = savedRedoStack ?? [];
		this.#recording = true;
	}

	record(items: any[]) {
		if (!this.#recording) return;
		const snapshot = $state.snapshot(items) as any[];
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
		this.#redoStack.push($state.snapshot(this.#items) as any[]);
		this.#pointer--;
		const entry = this.log[this.#pointer];
		this.#items.splice(0, this.#items.length, ...structuredClone(entry.snapshot));
		this.#onWrite();
	}

	redo() {
		if (!this.canRedo) return;
		const snapshot = this.#redoStack.pop()!;
		this.#pointer++;
		// Update log pointer entry to match
		if (this.#pointer >= this.log.length) {
			this.log.push({ snapshot: $state.snapshot(snapshot) as any[], timestamp: Date.now() });
		}
		this.#items.splice(0, this.#items.length, ...structuredClone(snapshot));
		this.#onWrite();
	}
}
