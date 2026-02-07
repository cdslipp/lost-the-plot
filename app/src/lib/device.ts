// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Detect device type from user agent and screen size.
 * Returns 'mobile', 'tablet', or 'desktop'.
 */
export function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
	const ua = navigator.userAgent;

	// Check for mobile devices first (phones)
	const isMobile =
		/Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
		(window.innerWidth <= 640 && 'ontouchstart' in window);

	if (isMobile) return 'mobile';

	// Check for tablets (iPad, Android tablets, etc.)
	const isTablet =
		/iPad|Android(?!.*Mobile)/i.test(ua) ||
		(navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);

	if (isTablet) return 'tablet';

	return 'desktop';
}
