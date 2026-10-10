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

export const authStorage = {
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
};
