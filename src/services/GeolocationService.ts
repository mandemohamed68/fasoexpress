import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export class GeolocationService {
  static async requestPermissions() {
    try {
      if (Capacitor.isNativePlatform()) {
        const perms = await Geolocation.checkPermissions();
        if (perms.location !== 'granted' && perms.coarseLocation !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
            console.warn("Location permission not granted by user.");
          }
        }
      }
    } catch (e: any) {
      if (e.message !== 'Not implemented on web.') {
        console.warn('GPS permission warning:', e);
      }
    }
  }

  static async getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    await this.requestPermissions();

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
      let timeoutId: any;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    };

    if (Capacitor.isNativePlatform()) {
      // 1. Try Capacitor Native Geolocation plugin (High accuracy)
      try {
        const position = await withTimeout(Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }), 16000);
        if (position?.coords) {
          return {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        }
      } catch (err1) {
        console.warn("Capacitor high accuracy geolocation failed, trying low accuracy...", err1);
        // 1b. Try Capacitor Native Geolocation plugin (Low accuracy / Coarse)
        try {
          const position = await withTimeout(Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000
          }), 11000);
          if (position?.coords) {
            return {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
          }
        } catch (err2) {
          console.warn("Capacitor low accuracy geolocation failed...", err2);
        }
      }
    }

    // 2. Fallback to HTML5 Browser Geolocation API
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        return await withTimeout(new Promise<{ lat: number; lng: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
          );
        }), 13000);
      } catch (browserErr1) {
        console.warn("HTML5 Geolocation high accuracy failed, trying low accuracy...", browserErr1);
        try {
          return await withTimeout(new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
            );
          }), 11000);
        } catch (browserErr2) {
          console.warn("HTML5 Geolocation low accuracy failed:", browserErr2);
        }
      }
    }

    throw new Error("Impossible d'obtenir la position GPS (délai dépassé ou permission refusée).");
  }

  static async watchPosition(onUpdate: (coords: { lat: number; lng: number }) => void, onError: (err: any) => void) {
    await this.requestPermissions();
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000 },
        (position, err) => {
          if (err) {
            onError(err);
            return;
          }
          if (position?.coords) {
            onUpdate({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        }
      );
      return id;
    } catch (e) {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const id = navigator.geolocation.watchPosition(
          (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => onError(err),
          { enableHighAccuracy: true }
        );
        return id.toString();
      }
    }
    return null;
  }

  static async clearWatch(watchId: string) {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (e) {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(parseInt(watchId, 10));
      }
    }
  }
}
