import re

with open('capacitor.config.ts', 'r') as f:
    content = f.read()

target = '''const config: CapacitorConfig = {
  appId: 'com.faso.express',
  appName: 'FASO EXPRESS',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    iosScheme: 'capacitor',
    cleartext: true
  }
};'''

replacement = '''const config: CapacitorConfig = {
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
};'''

if target in content:
    content = content.replace(target, replacement)
    with open('capacitor.config.ts', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
