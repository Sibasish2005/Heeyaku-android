import { authStorage } from '../services/authStorage';

/**
 * HEEYAKU Mobile API Configuration.
 * Defaults to live production HTTPS backend (https://heeyaku.com).
 */
export const BACKEND_PRESETS = {
  PRODUCTION: 'https://heeyaku.vercel.app',
  CUSTOM_DOMAIN: 'https://heeyaku.com',
  ADB_DEVICE: 'http://localhost:3000',
  EMULATOR_LOOPBACK: 'http://10.0.2.2:3000',
} as const;

export let API_BASE_URL: string = BACKEND_PRESETS.PRODUCTION;

export function setApiBaseUrl(url: string): void {
  if (!url || !url.trim()) return;
  API_BASE_URL = url.trim().replace(/\/+$/, '');
}

export async function initApiBaseUrl(): Promise<string> {
  try {
    const saved = await authStorage.getServerUrl();
    if (saved && saved.trim()) {
      API_BASE_URL = saved.trim().replace(/\/+$/, '');
    } else {
      API_BASE_URL = BACKEND_PRESETS.PRODUCTION;
    }
  } catch (e) {
    API_BASE_URL = BACKEND_PRESETS.PRODUCTION;
  }
  return API_BASE_URL;
}

export async function saveApiBaseUrl(url: string): Promise<void> {
  setApiBaseUrl(url);
  await authStorage.saveServerUrl(API_BASE_URL);
}

export const API_ENDPOINTS = {
  get login() { return `${API_BASE_URL}/api/employee/auth/login`; },
  get me() { return `${API_BASE_URL}/api/employee/auth/me`; },
  get leads() { return `${API_BASE_URL}/api/employee/leads`; },
  leadDisposition: (leadId: string) => `${API_BASE_URL}/api/employee/leads/${leadId}/disposition`,
  get syncCalls() { return `${API_BASE_URL}/api/employee/calls/sync`; },
  get analytics() { return `${API_BASE_URL}/api/employee/analytics`; },
  get verifyDeviceOtp() { return `${API_BASE_URL}/api/employee/auth/verify-device-otp`; },
  get resendDeviceOtp() { return `${API_BASE_URL}/api/employee/auth/resend-device-otp`; },
};


