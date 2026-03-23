import {
	getAction,
	getAvailableActions,
	getAllActions,
	getActionsForShortcut,
	isActionAvailable
} from './registry.js';
import type {
	ActionAvailabilityOptions,
	ActionContext,
	ActionResult,
	ExecuteActionOptions,
	UndoEntry
} from './types.js';

function snapshotContext(ctx: ActionContext): ActionContext {
	if (typeof structuredClone === 'function') {
		return structuredClone(ctx);
	}
	return {
		scope: ctx.scope,
		entityId: ctx.entityId,
		entityMeta: ctx.entityMeta ? { ...ctx.entityMeta } : null
	};
}

export interface ActionExecutorOptions {
	getContext: () => ActionContext;
	getAvailabilityOptions?: () => ActionAvailabilityOptions;
	navigate?: (to: string) => Promise<void> | void;
	toast?: {
		success?: (message: string, actionId: string) => void;
		error?: (message: string, actionId: string) => void;
	};
	maxUndoEntries?: number;
	onActionSettled?: (actionId: string, result: ActionResult) => void;
}

export interface ActionExecutor {
	executeAction: (
		actionId: string,
		params?: unknown,
		options?: ExecuteActionOptions
	) => Promise<ActionResult>;
	undoLastAction: (options?: ExecuteActionOptions) => Promise<ActionResult>;
	canUndo: () => boolean;
	getUndoStack: () => UndoEntry[];
	clearUndoStack: () => void;
	getAvailableActions: () => ReturnType<typeof getAvailableActions>;
	getActionsForShortcut: (shortcut: string) => ReturnType<typeof getActionsForShortcut>;
	isActionAvailable: (actionId: string) => boolean;
	getAllActions: () => ReturnType<typeof getAllActions>;
}

export function createActionExecutor(options: ActionExecutorOptions): ActionExecutor {
	const undoStack: UndoEntry[] = [];
	const maxUndoEntries = Math.max(1, options.maxUndoEntries ?? 50);

	const getCtx = () => snapshotContext(options.getContext());
	const getAvailability = () => options.getAvailabilityOptions?.() ?? {};

	async function executeAction(
		actionId: string,
		params?: unknown,
		execOptions: ExecuteActionOptions = {}
	): Promise<ActionResult> {
		const action = getAction(actionId);
		if (!action) {
			const missing = { success: false, error: `Unknown action: ${actionId}` };
			if (!execOptions.skipToasts) options.toast?.error?.(missing.error, actionId);
			return missing;
		}

		const availability = getAvailability();
		const ctx = getCtx();
		if (!isActionAvailable(action, ctx, availability)) {
			const unavailable = { success: false, error: `Action unavailable: ${action.label}` };
			if (!execOptions.skipToasts) options.toast?.error?.(unavailable.error, actionId);
			return unavailable;
		}

		try {
			const result = await action.execute(ctx, params);

			if (result.success) {
				if (!execOptions.skipToasts && result.message) {
					options.toast?.success?.(result.message, actionId);
				}
				if (!execOptions.skipHistory && action.undoable && result.undoPayload !== undefined) {
					undoStack.push({
						actionId,
						label: action.label,
						undoPayload: result.undoPayload,
						context: ctx,
						timestamp: Date.now()
					});
					if (undoStack.length > maxUndoEntries) undoStack.shift();
				}
				if (result.navigateTo) await options.navigate?.(result.navigateTo);
			} else if (!execOptions.skipToasts && result.error) {
				options.toast?.error?.(result.error, actionId);
			}

			options.onActionSettled?.(actionId, result);
			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Action failed';
			const failed = { success: false, error: message };
			if (!execOptions.skipToasts) options.toast?.error?.(message, actionId);
			options.onActionSettled?.(actionId, failed);
			return failed;
		}
	}

	async function undoLastAction(execOptions: ExecuteActionOptions = {}): Promise<ActionResult> {
		const entry = undoStack.pop();
		if (!entry) {
			const result = { success: false, error: 'Nothing to undo' };
			if (!execOptions.skipToasts) options.toast?.error?.(result.error, 'undo');
			return result;
		}

		const action = getAction(entry.actionId);
		if (!action?.undo) {
			const result = { success: false, error: `Action cannot be undone: ${entry.label}` };
			if (!execOptions.skipToasts) options.toast?.error?.(result.error, entry.actionId);
			return result;
		}

		try {
			const result = await action.undo(entry.context, entry.undoPayload);
			if (result.success) {
				if (!execOptions.skipToasts && result.message) {
					options.toast?.success?.(result.message, entry.actionId);
				}
				if (result.navigateTo) await options.navigate?.(result.navigateTo);
			} else if (!execOptions.skipToasts && result.error) {
				options.toast?.error?.(result.error, entry.actionId);
			}
			options.onActionSettled?.(`${entry.actionId}:undo`, result);
			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Undo failed';
			const failed = { success: false, error: message };
			if (!execOptions.skipToasts) options.toast?.error?.(message, entry.actionId);
			options.onActionSettled?.(`${entry.actionId}:undo`, failed);
			return failed;
		}
	}

	return {
		executeAction,
		undoLastAction,
		canUndo: () => undoStack.length > 0,
		getUndoStack: () => [...undoStack],
		clearUndoStack: () => {
			undoStack.length = 0;
		},
		getAvailableActions: () => getAvailableActions(getCtx(), getAvailability()),
		getActionsForShortcut: (shortcut: string) =>
			getActionsForShortcut(shortcut, getCtx(), getAvailability()),
		isActionAvailable: (actionId: string) => {
			const action = getAction(actionId);
			if (!action) return false;
			return isActionAvailable(action, getCtx(), getAvailability());
		},
		getAllActions
	};
}
