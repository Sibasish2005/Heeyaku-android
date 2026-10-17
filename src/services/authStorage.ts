import { NativeModules } from 'react-native';

const { CallTracker } = NativeModules;

export type EmployeeRole = 'CEO' | 'TEAM_LEAD' | 'HR' | 'BDA' | string;

export interface EmployeeProfile {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phoneNumber: string;
  team?: string | null;
  teamId?: string | null;
  role?: EmployeeRole;
}

export interface EmployeeSession {
  token: string;
  employee: EmployeeProfile;
}

const STORAGE_KEY = 'heeyaku_employee_session';
let memoryCache: EmployeeSession | null = null;
const unauthorizedListeners: Set<() => void> = new Set();

export const authStorage = {
  onUnauthorized(listener: () => void): () => void {
    unauthorizedListeners.add(listener);
    return () => {
      unauthorizedListeners.delete(listener);
    };
  },

  notifyUnauthorized(): void {
    unauthorizedListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('Error in unauthorized listener:', err);
      }
    });
  },
  async saveSession(session: EmployeeSession): Promise<void> {
    memoryCache = session;
    try {
      if (CallTracker?.setItem) {
        await CallTracker.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.warn('Failed to persist session to native storage:', e);
    }
  },

  async getSession(): Promise<EmployeeSession | null> {
    if (memoryCache) return memoryCache;
    try {
      if (CallTracker?.getItem) {
        const raw = await CallTracker.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          memoryCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load session from native storage:', e);
    }
    return null;
  },

  async clearSession(): Promise<void> {
    memoryCache = null;
    try {
      if (CallTracker?.removeItem) {
        await CallTracker.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to remove session from native storage:', e);
    }
  },

  async saveServerUrl(url: string): Promise<void> {
    try {
      if (CallTracker?.setItem) {
        await CallTracker.setItem('heeyaku_server_url', url);
      }
    } catch (e) {
      console.warn('Failed to save server URL to native storage:', e);
    }
  },

  async getServerUrl(): Promise<string | null> {
    try {
      if (CallTracker?.getItem) {
        const raw = await CallTracker.getItem('heeyaku_server_url');
        if (raw && typeof raw === 'string') {
          return raw.trim();
        }
      }
    } catch (e) {
      console.warn('Failed to get server URL from native storage:', e);
    }
    return null;
  },

  async getDeviceId(): Promise<string> {
    const DEVICE_ID_KEY = 'heeyaku_device_id';
    try {
      if (CallTracker?.getItem) {
        const existing = await CallTracker.getItem(DEVICE_ID_KEY);
        if (existing && typeof existing === 'string' && existing.trim()) {
          return existing.trim();
        }
      }
    } catch (_) {}

    const newId = `dev_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    try {
      if (CallTracker?.setItem) {
        await CallTracker.setItem(DEVICE_ID_KEY, newId);
      }
    } catch (_) {}
    return newId;
  },
};
