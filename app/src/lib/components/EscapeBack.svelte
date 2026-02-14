<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	/**
	 * Derives the "back" URL from the current pathname.
	 * /bands → /, /bands/[id] → /bands, /bands/[id]/plots/[id] → /bands/[id], etc.
	 */
	function getParentPath(pathname: string): string | null {
		if (pathname === '/') return null;
		if (pathname.startsWith('/s/') || pathname.startsWith('/sl/')) return null;
		if (pathname === '/mobile' || pathname === '/tablet') return null;

		const segments = pathname.split('/').filter(Boolean);
		if (segments.length === 0) return null;
		if (segments.length <= 2) {
			return segments.length === 1 ? '/' : `/${segments[0]}`;
		}
		// 4-segment: /bands/id/plots/id → /bands/id
		return `/${segments[0]}/${segments[1]}`;
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (e.defaultPrevented) return;

		// Don't navigate if the event targeted an interactive element
		const target = e.target;
		if (target instanceof HTMLElement) {
			const tag = target.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
				return;
			}
		}

		// Don't navigate if a dialog or modal is open
		if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open]')) {
			return;
		}

		const parentPath = getParentPath($page.url.pathname);
		if (parentPath) {
			e.preventDefault();
			goto(parentPath);
		}
	}
</script>

<svelte:window onkeydown={handleEscape} />
