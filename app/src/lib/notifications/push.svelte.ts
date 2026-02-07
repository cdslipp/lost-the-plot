import {
	isIOS,
	isStandalone,
	getNotificationPermission,
	canRequestPermission,
	requestNotificationPermission,
	sendTestNotification,
	type NotificationPermission,
	type NotificationState
} from './push';

class NotificationStore {
	permission = $state<NotificationPermission>('default');
	isIOS = $state<boolean>(false);
	isStandalone = $state<boolean>(false);
	canRequest = $state<boolean>(false);

	get state(): NotificationState {
		return {
			permission: this.permission,
			isIOS: this.isIOS,
			isStandalone: this.isStandalone,
			canRequestPermission: this.canRequest
		};
	}

	get isGranted(): boolean {
		return this.permission === 'granted';
	}

	get isDenied(): boolean {
		return this.permission === 'denied';
	}

	get needsInstall(): boolean {
		return this.isIOS && !this.isStandalone;
	}

	init(): void {
		if (typeof window === 'undefined') return;

		this.isIOS = isIOS();
		this.isStandalone = isStandalone();
		this.permission = getNotificationPermission();
		this.canRequest = canRequestPermission();
	}

	async requestPermission(): Promise<NotificationPermission> {
		const result = await requestNotificationPermission();
		this.permission = result;
		this.canRequest = canRequestPermission();
		return result;
	}

	async sendTest(): Promise<boolean> {
		return sendTestNotification();
	}
}

export const notifications = new NotificationStore();
