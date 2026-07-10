import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './apiService';

export const pushNotificationService = {
  async register(userId: string) {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Push] Web browser platform: skipping native push notifications configuration.');
      return;
    }

    try {
      // 1. Check/request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Push] User denied permissions for native push notifications.');
        return;
      }

      // 2. Register with APNs/FCM
      await PushNotifications.register();

      // 3. Register native event listeners
      await this.setupListeners(userId);
    } catch (error) {
      console.error('[Push] Native push notification configuration error:', error);
    }
  },

  async setupListeners(userId: string) {
    // Clean previous listeners to prevent duplicates
    await PushNotifications.removeAllListeners();

    // Listen for FCM token registration success
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Native device registered successfully. Token:', token.value);
      const platform = Capacitor.getPlatform(); // 'android' or 'ios'
      try {
        await api.pushTokens.register(token.value, platform);
        localStorage.setItem('fcm_token', token.value);
        console.log('[Push] Device token synced with application server.');
      } catch (err) {
        console.error('[Push] Failed to sync token with application server:', err);
      }
    });

    // Listen for registration error
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Device registration failed:', error.error);
    });

    // When a push notification is received while app is active (foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received while app was active:', notification);
    });

    // When user taps/clicks a native push notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Action performed on push notification:', notification);
      const data = notification.notification.data;
      if (data && data.deliveryId) {
        // Deep link redirection (standard React router support via url/hash parsing)
        window.location.href = `#/deliveries/${data.deliveryId}`;
      }
    });
  },

  async unregister() {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const savedToken = localStorage.getItem('fcm_token');
      if (savedToken) {
        await api.pushTokens.delete(savedToken);
        localStorage.removeItem('fcm_token');
        console.log('[Push] Token successfully deregistered.');
      }
      await PushNotifications.removeAllListeners();
    } catch (error) {
      console.error('[Push] Deregistration failed:', error);
    }
  }
};
