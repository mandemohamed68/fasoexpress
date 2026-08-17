import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';

export const triggerVibration = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            // Native vibration using official Capacitor Haptics
            await Haptics.notification({
                type: NotificationType.Success
            });
            // Additional vibration pattern for devices that support it
            await Haptics.vibrate({ duration: 300 });
        } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            // HTML5 vibration fallback for Web
            navigator.vibrate([150, 100, 150]);
        }
    } catch (e) {
        console.warn("Vibration triggered but failed or unsupported:", e);
    }
};

export const playNotificationSound = () => {
    // Also trigger vibration alongside notification sound
    triggerVibration();

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    try {
        const ctx = new AudioContext();
        
        const playBeep = (time: number, freq: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            osc.start(time);
            osc.stop(time + duration);
        };

        // Play a triple-beep sequence
        playBeep(ctx.currentTime, 880, 0.2);
        playBeep(ctx.currentTime + 0.25, 880, 0.2);
        playBeep(ctx.currentTime + 0.5, 1200, 0.4);
    } catch (e) {
        console.warn("Audio Context blocked or failed:", e);
    }
};

