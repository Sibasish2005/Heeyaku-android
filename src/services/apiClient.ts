import { authStorage } from './authStorage';
import { API_ENDPOINTS } from '../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  isUnauthorized?: boolean;
  isRateLimited?: boolean;
  [key: string]: any;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();
  let json: Record<string, any> = {};
  try {
    json = JSON.parse(text);
  } catch {
    // Non-JSON response
    return {
      success: false,
      error: 'Unable to process server response. Please try again.',
      status: response.status,
    };
  }

  if (response.status === 401) {
    return {
      success: false,
      error: json.error || 'Session expired. Please log in again.',
      isUnauthorized: true,
      status: 401,
    };
  }

  if (response.status === 429) {
    return {
      success: false,
      error: 'Too many requests. Please wait a moment before trying again.',
      isRateLimited: true,
      status: 429,
    };
  }

  if (!response.ok && !json.error) {
    json.error = 'Unable to complete request. Please try again.';
  }

  return {
    ...json,
    success: Boolean(json.success && response.ok),
    status: response.status,
  };
}

async function authenticatedRequest(url: string, options: RequestInit = {}): Promise<ApiResponse> {
  const session = await authStorage.getSession();
  if (!session?.token) {
    return { success: false, error: 'Authentication required', isUnauthorized: true };
  }

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        'x-employee-token': session.token,
        'x-authorization': `Bearer ${session.token}`,
        ...(options.headers || {}),
      },
    });

    const parsed = await parseResponse(response);
    if (parsed.isUnauthorized) {
      await authStorage.clearSession();
      authStorage.notifyUnauthorized();
    }
    return parsed;
  } catch {
    return { success: false, error: 'Network connection error. Please try again.' };
  }
}

export const apiClient = {
  async login(
    identifier: string,
    password: string,
    deviceId?: string,
    deviceName?: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetchWithTimeout(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, deviceId, deviceName }),
      });
      return await parseResponse(response);
    } catch {
      return {
        success: false,
        error: 'Unable to reach the server. Please check your connection.',
      };
    }
  },

  async verifyDeviceOtp(
    tempToken: string,
    code: string,
    deviceId: string,
    deviceName?: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetchWithTimeout(API_ENDPOINTS.verifyDeviceOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code, deviceId, deviceName }),
      });
      return await parseResponse(response);
    } catch {
      return {
        success: false,
        error: 'Unable to reach the server. Please check your connection.',
      };
    }
  },

  async resendDeviceOtp(tempToken: string, deviceId: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithTimeout(API_ENDPOINTS.resendDeviceOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, deviceId }),
      });
      return await parseResponse(response);
    } catch {
      return {
        success: false,
        error: 'Unable to reach the server. Please check your connection.',
      };
    }
  },

  async getMe(): Promise<ApiResponse> {
    return authenticatedRequest(API_ENDPOINTS.me, { method: 'GET' });
  },

  async getAssignedLeads(): Promise<ApiResponse> {
    return authenticatedRequest(API_ENDPOINTS.leads, { method: 'GET' });
  },

  async submitLeadDisposition(
    leadId: string,
    payload: { status: string; notes?: string; callDuration?: number }
  ): Promise<ApiResponse> {
    return authenticatedRequest(API_ENDPOINTS.leadDisposition(leadId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async syncCalls(calls: unknown[]): Promise<ApiResponse> {
    return authenticatedRequest(API_ENDPOINTS.syncCalls, {
      method: 'POST',
      body: JSON.stringify({ calls }),
    });
  },

  async getAnalytics(): Promise<ApiResponse> {
    return authenticatedRequest(API_ENDPOINTS.analytics, { method: 'GET' });
  },
};

