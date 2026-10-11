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
      error: response.ok
        ? 'Unexpected response from server.'
        : `Server returned HTTP ${response.status} (${response.statusText || 'Error'}).`,
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
      error: json.error || 'Too many requests. Please wait a moment.',
      isRateLimited: true,
      status: 429,
    };
  }

  if (!response.ok && !json.error) {
    json.error = `Server returned HTTP ${response.status}`;
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
    return { success: false, error: 'Unauthenticated session', isUnauthorized: true };
  }

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...(options.headers || {}),
      },
    });

    const parsed = await parseResponse(response);
    if (parsed.isUnauthorized) {
      console.warn('[API] Received 401 Unauthorized, clearing session');
      await authStorage.clearSession();
      authStorage.notifyUnauthorized();
    }
    return parsed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network request failed.';
    return { success: false, error: `Could not connect to server (${message}).` };
  }
}

export const apiClient = {
  async login(identifier: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithTimeout(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      return await parseResponse(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network request failed.';
      return {
        success: false,
        error: `Could not connect to server at ${API_ENDPOINTS.login}. (${message})`,
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

