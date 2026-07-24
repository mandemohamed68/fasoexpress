import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './apiService';
import { playNotificationSound } from '../lib/audio';

export const pushNotificationService = {
  async register(userId: string) {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Push] Web browser platform: skipping native push notifications configuration.');
      return;
    }

    try {
      // Create high-importance notification channel with vibration for Android devices
      if (Capacitor.getPlatform() === 'android') {
        try {
          await PushNotifications.createChannel({
            id: 'high_importance_channel',
            name: 'Faso Express Notifications',
            description: 'Canal de notifications importantes de Faso Express',
            importance: 5, // IMPORTANCE_HIGH: vibration and sound enabled
            sound: 'default',
            visibility: 1, // VISIBILITY_PUBLIC
            vibration: true
          });
          console.log('[Push] High importance channel created successfully on Android.');
        } catch (channelErr) {
          console.error('[Push] Failed to create Android notification channel:', channelErr);
        }
      }

      // 1. Check/request permission
      let permStatus = await PushNotifications.checkPermissions();


      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Push] User denied permissions for native push notifications.');
        return;
      }

      // 3. Register native event listeners (setup BEFORE register)
      console.log('[Push] Setting up listeners...');
      await this.setupListeners(userId);
      console.log('[Push] Listeners setup complete.');

      // 2. Register with APNs/FCM
      console.log('[Push] Registering with native platform...');
      await PushNotifications.register().catch(err => {
        console.error('[Push] Critical error during register():', err);
        throw err; // Re-throw to be caught by the outer catch
      });

      console.log('[Push] Registration complete.');
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
      playNotificationSound();
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
