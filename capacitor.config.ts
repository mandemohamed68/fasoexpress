import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faso.express',
  appName: 'FASO EXPRESS',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    iosScheme: 'capacitor',
    cleartext: true
  }
};

export default config;
