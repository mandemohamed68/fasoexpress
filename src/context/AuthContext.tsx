import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole, AppConfig } from '../types';
import { AppLanguage, translations } from '../lib/translations';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: { userId: string; email: string; role: string; name: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  isMasterAdmin: boolean;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  appConfig: AppConfig | null;
  refreshAppConfig: () => Promise<void>;
  t: (key: keyof typeof translations.fr, params?: Record<string, any>) => string;
  login: (email: string, pass: string, role?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string, role?: UserRole) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role: UserRole, extra?: Partial<UserProfile>) => Promise<void>;
  loginWithPhone: (phoneNumber: string) => Promise<any>;
  logout: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_EMAILS = ['mandemohamed68@gmail.com', 'mandemohamed6868@gmail.com'];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ userId: string; email: string; role: string; name: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Use localStorage to cache appConfig to avoid Hammering API on boot
  const [appConfig, setAppConfig] = useState<AppConfig | null>(() => {
    try {
      const cached = localStorage.getItem('app_config');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn("Failed to parse cached app_config", e);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('fr');

  const isMasterAdmin = user?.email ? ADMIN_EMAILS.includes(user.email) : false;

  const refreshAppConfig = async () => {
    try {
      const config = await api.config.get('app_config');
      if (config) {
        setAppConfig((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(config)) {
            localStorage.setItem('app_config', JSON.stringify(config));
            return config;
          }
          return prev;
        });
      }
    } catch (e) {
      console.warn("Could not refresh app config", e);
    }
  };

  const t = (key: keyof typeof translations.fr, params?: Record<string, any>) => {
    let text = translations[language][key] || translations.fr[key] || key;
    if (params) {
      Object.keys(params).forEach(p => {
        text = (text as string).replace(`\${${p}}`, params[p]);
      });
    }
    return text;
  };

  const refreshProfile = async () => {
    try {
      const p = await api.profile.get();
      setProfile(p);
      if (p) {
        setUser({ userId: p.userId, email: p.email, role: p.role, name: p.name });
        localStorage.setItem('last_active_timestamp', Date.now().toString());
      }
    } catch (e) {
      console.warn("Could not refresh profile", e);
    }
  };

  // Initial Load with 7-day activity check
  useEffect(() => {
    const init = async () => {
      // Fallback timer to prevent getting stuck in LoadingScreen
      const fallbackTimer = setTimeout(() => {
        setIsAuthReady(true);
      }, 5000);

      const token = localStorage.getItem('auth_token');
      const lastActive = localStorage.getItem('last_active_timestamp');

      // Check if session has been inactive for more than 7 days
      if (token && lastActive) {
        const inactiveDuration = Date.now() - Number(lastActive);
        if (inactiveDuration > SEVEN_DAYS_MS) {
          console.warn("[AUTH] Session expired: 7 days without connection or activity.");
          localStorage.removeItem('auth_token');
          localStorage.removeItem('last_active_timestamp');
          toast.error("Votre session a expiré après 7 jours d'inactivité. Veuillez vous reconnecter.");
          clearTimeout(fallbackTimer);
          setIsAuthReady(true);
          return;
        }
      }
      
      try {
        // Load config from cache first, then refresh in background
        const [configRes, profileRes] = await Promise.allSettled([
          api.config.get('app_config').catch(() => null),
          token ? api.profile.get().catch(() => null) : Promise.reject('No token')
        ]);

        if (configRes.status === 'fulfilled' && configRes.value) {
          setAppConfig(configRes.value);
          localStorage.setItem('app_config', JSON.stringify(configRes.value));
        }

        if (profileRes.status === 'fulfilled' && profileRes.value) {
          setProfile(profileRes.value);
          setUser({ 
            userId: profileRes.value.userId, 
            email: profileRes.value.email, 
            role: profileRes.value.role,
            name: profileRes.value.name
          });
          localStorage.setItem('last_active_timestamp', Date.now().toString());
        } else {
          if (token) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('last_active_timestamp');
          }
        }
      } catch (e) {
        console.error("Auth initialization failed", e);
      } finally {
        clearTimeout(fallbackTimer);
        setIsAuthReady(true);
      }
    };
    init();
  }, []);

  // AUTOMATIC REAL-TIME SYNC FOR MOBILE & WEB:
  // Auto-refreshes app_config from backend immediately on app resume/focus/online
  useEffect(() => {
    // 1. Immediate refresh when mobile app comes back to foreground, screen unlocks, or internet reconnects
    const handleImmediateSync = () => {
      refreshAppConfig();
    };

    // 3. Sync immediately across tabs / webviews when localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app_config' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setAppConfig(parsed);
        } catch (err) {}
      }
    };

    const handleCustomConfigEvent = (e: any) => {
      if (e.detail) {
        setAppConfig(e.detail);
        localStorage.setItem('app_config', JSON.stringify(e.detail));
      } else {
        refreshAppConfig();
      }
    };

    window.addEventListener('visibilitychange', handleImmediateSync);
    window.addEventListener('focus', handleImmediateSync);
    window.addEventListener('online', handleImmediateSync);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('app_config_updated', handleCustomConfigEvent);

    return () => {
      window.removeEventListener('visibilitychange', handleImmediateSync);
      window.removeEventListener('focus', handleImmediateSync);
      window.removeEventListener('online', handleImmediateSync);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app_config_updated', handleCustomConfigEvent);
    };
  }, []);

  // Track user activity and check for 7-day inactivity expiration while active
  useEffect(() => {
    if (!user?.userId) return;

    const updateActivity = () => {
      localStorage.setItem('last_active_timestamp', Date.now().toString());
    };

    updateActivity();

    let lastRecorded = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 60000) { // Update at most once per minute
        lastRecorded = now;
        updateActivity();
      }
    };

    const checkExpiration = () => {
      const lastActive = localStorage.getItem('last_active_timestamp');
      if (lastActive && Date.now() - Number(lastActive) > SEVEN_DAYS_MS) {
        toast.error("Votre session a expiré après 7 jours d'inactivité. Veuillez vous reconnecter.");
        logout();
      }
    };

    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('focus', checkExpiration);

    const interval = setInterval(checkExpiration, 60000);

    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('focus', checkExpiration);
      clearInterval(interval);
    };
  }, [user?.userId]);

  const loginWithEmail = async (email: string, pass: string, role?: UserRole) => {
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password: pass, role });
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('last_active_timestamp', Date.now().toString());
      setUser(res.user);
      setProfile(res.user); // Initial profile match user object from server
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const login = loginWithEmail; // Alias for compatibility

  const registerWithEmail = async (email: string, pass: string, name: string, role: UserRole, extra?: Partial<UserProfile>) => {
    setLoading(true);
    try {
      const res = await api.auth.register({ email, password: pass, name, role, ...extra });
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('last_active_timestamp', Date.now().toString());
      setUser(res.user);
      setProfile(res.user);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const { pushNotificationService } = await import('../services/pushNotificationService');
      await pushNotificationService.unregister();
    } catch (e) {
      console.warn("Unregister push notifications failed on logout", e);
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('last_active_timestamp');
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  // Auto-register native push notifications when user session is active
  useEffect(() => {
    if (user?.userId) {
      import('../services/pushNotificationService').then(({ pushNotificationService }) => {
        pushNotificationService.register(user.userId);
      }).catch(err => {
        console.warn("Could not dynamically import pushNotificationService", err);
      });
    }
  }, [user]);

  // Handle account suspension event
  useEffect(() => {
    const handleAccountSuspended = (e: any) => {
      const message = e.detail || "Votre compte a été suspendu par l'administration. Veuillez prendre attache avec le support.";
      
      try {
        import('../services/pushNotificationService').then(({ pushNotificationService }) => {
          pushNotificationService.unregister();
        });
      } catch (err) { }
      
      localStorage.removeItem('auth_token');
      setUser(null);
      setProfile(null);
      
      toast.error(message, { duration: 10000 });
      
      // Optionally redirect if using router outside of App rendering
      window.location.hash = '#/';
    };

    window.addEventListener('account_suspended', handleAccountSuspended);
    return () => {
      window.removeEventListener('account_suspended', handleAccountSuspended);
    };
  }, []);

  const loginWithPhone = async (phone: string) => {
    console.warn("Phone login is not fully implemented in current version", phone);
    return Promise.reject("Authentification par téléphone non implémentée.");
  };

  const updateRole = async (role: UserRole) => {
    try {
      await api.profile.update({ role });
      await refreshProfile();
    } catch (e: any) {
      console.error("Failed to update role", e);
      const isTrueOffline = (typeof navigator !== 'undefined' && !navigator.onLine);
      const errorMsg = isTrueOffline 
        ? "Vous êtes actuellement hors connexion internet." 
        : (e?.message || "Erreur lors de la mise à jour du rôle.");
      toast.error(errorMsg);
      throw e;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      await api.profile.update(data);
      await refreshProfile();
    } catch (e: any) {
      console.error("Failed to update profile", e);
      const isTrueOffline = (typeof navigator !== 'undefined' && !navigator.onLine);
      const errorMsg = isTrueOffline 
        ? "Vous êtes actuellement hors connexion internet." 
        : (e?.message || "Erreur lors de la mise à jour du profil.");
      toast.error(errorMsg);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, isAuthReady, isMasterAdmin, language, setLanguage, t, 
      appConfig, refreshAppConfig,
      login, loginWithEmail, registerWithEmail, loginWithPhone,
      logout, updateRole, updateProfile, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
