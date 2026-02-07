export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface NotificationState {
	permission: NotificationPermission;
	isIOS: boolean;
	isStandalone: boolean;
	canRequestPermission: boolean;
}

/**
 * Detect if running on iOS
 */
export function isIOS(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

/**
 * Detect if running as installed PWA (standalone mode)
 */
export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

/**
 * Check if notifications are supported
 */
export function notificationsSupported(): boolean {
	if (typeof window === 'undefined') return false;
	return 'Notification' in window;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
	if (!notificationsSupported()) return 'denied';
	return Notification.permission as NotificationPermission;
}

/**
 * Check if we can request notification permission
 * On iOS, this requires being installed as a PWA (standalone mode)
 */
export function canRequestPermission(): boolean {
	if (!notificationsSupported()) return false;
	if (isIOS() && !isStandalone()) return false;
	return Notification.permission !== 'denied';
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	console.log('[Notifications] Requesting permission...');
	console.log('[Notifications] canRequestPermission:', canRequestPermission());

	if (!canRequestPermission()) {
		const current = getNotificationPermission();
		console.log('[Notifications] Cannot request, current permission:', current);
		return current;
	}

	const result = await Notification.requestPermission();
	console.log('[Notifications] Permission result:', result);
	return result as NotificationPermission;
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<boolean> {
	const permission = getNotificationPermission();
	console.log('[Notifications] Current permission:', permission);

	if (permission !== 'granted') {
		console.log('[Notifications] Permission not granted, aborting');
		return false;
	}

	try {
		console.log('[Notifications] Checking for service worker...');
		const registration = await navigator.serviceWorker?.ready;
		console.log('[Notifications] Service worker registration:', registration);

		if (registration) {
			console.log('[Notifications] Sending via service worker...');
			await registration.showNotification('Test Notification', {
				body: 'Push notifications are working!',
				icon: '/icons/icon-192.png',
				badge: '/icons/icon-192.png'
			});
			console.log('[Notifications] Service worker notification sent');
		} else {
			console.log('[Notifications] No service worker, using Notification API directly...');
			const notif = new Notification('Test Notification', {
				body: 'Notifications are working!',
				icon: '/icons/icon-192.png'
			});
			console.log('[Notifications] Direct notification created:', notif);
		}
	} catch (err) {
		console.error('[Notifications] Failed to send notification:', err);
		return false;
	}
	return true;
}
