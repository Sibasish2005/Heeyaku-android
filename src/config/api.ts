/**
 * HEEYAKU Mobile API Configuration.
 * Configured for USB/ADB Connected Android Device (adb reverse tcp:3000 tcp:3000)
 */
export const BACKEND_PRESETS = {
  ADB_DEVICE: 'http://localhost:3000',
  PRODUCTION: 'https://heeyaku.vercel.app',
} as const;

export let API_BASE_URL: string = BACKEND_PRESETS.ADB_DEVICE;

export function setApiBaseUrl(url: string): void {
  API_BASE_URL = url.trim().replace(/\/+$/, '');
}

export const API_ENDPOINTS = {
  get login() { return `${API_BASE_URL}/api/employee/auth/login`; },
  get me() { return `${API_BASE_URL}/api/employee/auth/me`; },
  get leads() { return `${API_BASE_URL}/api/employee/leads`; },
  leadDisposition: (leadId: string) => `${API_BASE_URL}/api/employee/leads/${leadId}/disposition`,
  get syncCalls() { return `${API_BASE_URL}/api/employee/calls/sync`; },
  get analytics() { return `${API_BASE_URL}/api/employee/analytics`; },
};


