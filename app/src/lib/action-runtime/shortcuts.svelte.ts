import { normalizeShortcut } from '@stageplotter/action-registry';
import { actionExecutor } from './executor';

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function eventToShortcut(event: KeyboardEvent): string {
	const key = event.key.toLowerCase();
	const modifiers: string[] = [];
	if (event.metaKey || event.ctrlKey) modifiers.push('mod');
	if (event.shiftKey) modifiers.push('shift');
	if (event.altKey) modifiers.push('alt');
	return normalizeShortcut([...modifiers, key].join('+'));
}

export function formatShortcut(shortcut: string): string {
	const normalized = normalizeShortcut(shortcut);
	if (!normalized) return '';
	const parts = normalized.split('+');
	return parts
		.map((part) => {
			if (part === 'mod') return 'Mod';
			if (part === 'shift') return 'Shift';
			if (part === 'alt') return 'Alt';
			if (part === 'escape') return 'Esc';
			if (part === 'arrowup') return 'Up';
			if (part === 'arrowdown') return 'Down';
			if (part === 'arrowleft') return 'Left';
			if (part === 'arrowright') return 'Right';
			if (part === ' ') return 'Space';
			return part.length === 1 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`;
		})
		.join('+');
}

export async function handleGlobalActionShortcuts(event: KeyboardEvent): Promise<boolean> {
	if (isTypingTarget(event.target)) return false;

	const shortcut = eventToShortcut(event);
	if (!shortcut) return false;

	const matchingActions = actionExecutor.getActionsForShortcut(shortcut);
	if (matchingActions.length === 0) return false;

	event.preventDefault();
	await actionExecutor.executeAction(matchingActions[0].id);
	return true;
}
