// Service central pour les appels API vers le serveur local (Debian)
// Remplace les appels directs à Firebase SDK
import { Capacitor } from '@capacitor/core';

export const getApiBase = () => {
  if (Capacitor.isNativePlatform()) {
    return "http://167.172.39.172:1010/api";
  }
  return "/api";
};

async function request(endpoint: string, method = 'GET', body?: any, retryCount = 0): Promise<any> {
  const token = localStorage.getItem('auth_token');
  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const API_BASE = getApiBase();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 429 && retryCount < 3) {
    const delay = Math.pow(2, retryCount) * 1000;
    console.warn(`API Rate limit hit. Retrying in ${delay}ms... (Attempt ${retryCount + 1})`);
    await new Promise(r => setTimeout(r, delay));
    return request(endpoint, method, body, retryCount + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`API Request failed: ${endpoint} ${method} - Status: ${response.status}`, text);
    let err;
    try {
      err = JSON.parse(text);
    } catch (e) {
      err = null;
    }
    
    if (response.status === 403 && err?.error === "ACCOUNT_SUSPENDED") {
      window.dispatchEvent(new CustomEvent('account_suspended', { detail: err?.details }));
      throw new Error(err?.details || "Compte suspendu");
    }
    
    if (response.status === 403) {
      throw new Error(err?.details || err?.error || "Vous n’avez pas les droits pour accéder à cette ressource.");
    }
    throw new Error((err && (err.details || err.error)) || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

export const api = {
  users: {
    get: (id: string) => request(`/users/${id}`),
  },
  auth: {
    login: (credentials: any) => request('/auth/login', 'POST', credentials),
    register: (userData: any) => request('/auth/register', 'POST', userData),
    forgotPassword: (email: string) => request('/auth/forgot-password', 'POST', { email }),
    resetPassword: (data: { email: string; code: string; newPassword: any }) => request('/auth/reset-password', 'POST', data),
  },
  profile: {
    get: () => request('/profile'),
    update: (data: any) => request('/profile', 'PATCH', data),
  },
  deliveries: {
    list: () => request('/deliveries'),
    get: (id: string) => request(`/deliveries/${id}`),
    create: (data: any) => request('/deliveries', 'POST', data),
    update: (id: string, data: any) => request(`/deliveries/${id}`, 'PATCH', data),
    delete: (id: string) => request(`/deliveries/${id}`, 'DELETE'),
    messages: {
      list: (id: string) => request(`/deliveries/${id}/messages`),
      send: (id: string, data: any) => request(`/deliveries/${id}/messages`, 'POST', data),
    },
    bids: {
      list: (id: string) => request(`/deliveries/${id}/bids`),
      place: (id: string, data: any) => request(`/deliveries/${id}/bids`, 'POST', data),
      decline: (id: string, driverId: string) => request(`/deliveries/${id}/bids/${driverId}/decline`, 'POST'),
    },
    cancel: (id: string, motif: string) => request(`/courses/${id}/annuler`, 'POST', { motif }),
    coursesNegotiations: {
      accepter: (id: string, driverId: string, price: number) => request(`/courses/${id}/accepter-proposition`, 'POST', { driverId, price }),
      rejeter: (id: string, driverId: string) => request(`/courses/${id}/rejeter-proposition`, 'POST', { driverId }),
    },
    tracking: {
      update: (id: string, data: any) => request(`/deliveries/${id}/tracking`, 'POST', data),
    }
  },
  notifications: {
    list: () => request('/app-notifications'),
    create: (data: any) => request('/app-notifications', 'POST', data),
    markAsRead: (id: string) => request(`/app-notifications/${id}/read`, 'PATCH'),
    delete: (id: string) => request(`/app-notifications/${id}`, 'DELETE'),
  },
  pushTokens: {
    register: (token: string, deviceType: string) => request('/push-tokens', 'POST', { token, deviceType }),
    delete: (token: string) => request('/push-tokens/delete', 'POST', { token }),
  },
  drivers: {
    status: () => request('/drivers/status'),
    getMissionHistory: (id: string) => request(`/drivers/${id}/mission-history`),
  },
  config: {
    get: (key: string) => request(`/preferences-majeures/${key}`),
    update: (key: string, data: any) => request(`/preferences-majeures/${key}`, 'POST', data),
  },
  health: () => request('/health'),
  admin: {
    users: {
      list: () => request('/user-directory'),
      create: (data: any) => request('/user-directory', 'POST', data),
      update: (userId: string, data: any) => request(`/user-directory/${userId}`, 'PATCH', data),
      delete: (userId: string) => request(`/user-directory/${userId}`, 'DELETE'),
      updateRole: (userId: string, role: string) => request(`/user-directory/${userId}/role`, 'PATCH', { role }),
    },
    withdrawals: {
      list: () => request('/payout-registry'),
      validate: (id: string, data?: { mode?: 'manual' | 'auto' | 'force', txId?: string }) => request(`/payout-registry/${id}/valider`, 'POST', data),
      reject: (id: string, reason?: string) => request(`/payout-registry/${id}/rejeter`, 'POST', { reason }),
    },
    reset: () => request('/system-maintenance-reset', 'POST'),
    seed: () => request('/system-maintenance-seed', 'POST'),
    querySql: (sql: string) => request('/db-query-tool', 'POST', { sql }),
  },
  withdrawals: {
    create: (data: any) => request('/withdrawals', 'POST', data),
    list: () => request('/withdrawals'),
    gainsHistory: () => request('/drivers/gains-history'),
  },
  announcements: {
    list: () => request('/announcements'),
    create: (data: any) => request('/announcements', 'POST', data),
    delete: (id: string) => request(`/announcements/${id}`, 'DELETE'),
  },
  sectors: {
    list: () => request('/sectors'),
    create: (data: any) => request('/sectors', 'POST', data),
    delete: (id: string) => request(`/sectors/${id}`, 'DELETE'),
  },
  promo: {
    validate: (code: string, amount: number) => request('/promo/validate', 'POST', { code, amount }),
    use: (code: string, deliveryId?: string) => request('/promo/use', 'POST', { code, deliveryId }),
    list: () => request('/marketing-codes'),
    create: (data: any) => request('/marketing-codes', 'POST', data),
    delete: (code: string) => request(`/marketing-codes/${code}`, 'DELETE'),
  }
};
