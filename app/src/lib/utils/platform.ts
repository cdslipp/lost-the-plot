import { browser } from '$app/environment';

export const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl+';
