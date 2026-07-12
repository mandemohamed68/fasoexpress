import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = '''const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {'''

replacement = '''import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (user && Capacitor.isNativePlatform()) {
      const askPerms = async () => {
        try {
          const geoPerms = await Geolocation.checkPermissions();
          if (geoPerms.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
          const pushPerms = await PushNotifications.checkPermissions();
          if (pushPerms.receive !== 'granted') {
            await PushNotifications.requestPermissions();
          }
        } catch (e) {
          console.warn('Erreur lors de la demande de permissions:', e);
        }
      };
      // Demander les permissions 2 secondes après le chargement pour ne pas bloquer l'UI
      setTimeout(askPerms, 2000);
    }
  }, [user]);

  if (loading) {'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
