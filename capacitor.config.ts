import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faso.express',
  appName: 'FASO EXPRESS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
