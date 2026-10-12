import { NativeModules } from 'react-native';
import { apiClient } from './apiClient';

const { CallTracker } = NativeModules;
export const CACHED_LEADS_KEY = 'heeyaku_cached_leads';

export interface AssignedLead {
  id: string;
  leadCode: string;
  name: string;
  phoneNumber: string;
  company?: string | null;
  status: string;
  disposition?: string | null;
  assignedEmployeeId?: string | null;
  [key: string]: any;
}

let cachedLeadsMemory: AssignedLead[] = [];
let leadPhoneSet = new Set<string>();

/**
 * Normalizes phone numbers to their last 10 digits for accurate comparison
 * across country codes (+91, 0, etc.) and punctuation.
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function updateLeadPhoneSet(leads: AssignedLead[]) {
  cachedLeadsMemory = leads;
  leadPhoneSet = new Set(
    leads.map(l => normalizePhoneNumber(l.phoneNumber)).filter(Boolean)
  );
}

export const assignedLeadsService = {
  /**
   * Get cached assigned leads from memory or native storage
   */
  async getCachedLeads(): Promise<AssignedLead[]> {
    if (cachedLeadsMemory.length > 0) {
      return cachedLeadsMemory;
    }
    try {
      if (CallTracker?.getItem) {
        const raw = await CallTracker.getItem(CACHED_LEADS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            updateLeadPhoneSet(parsed);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to read cached assigned leads:', err);
    }
    return [];
  },

  /**
   * Refresh assigned leads from server and update local cache
   */
  async refreshAssignedLeads(): Promise<AssignedLead[]> {
    try {
      const res = await apiClient.getAssignedLeads();
      if (res.success && Array.isArray(res.leads)) {
        // Merge with existing cached leads so leads never vanish
        const existing = cachedLeadsMemory.length > 0 ? cachedLeadsMemory : await this.getCachedLeads();
        const map = new Map<string, AssignedLead>();
        for (const l of existing) {
          map.set(l.id, l);
        }
        for (const l of res.leads) {
          map.set(l.id, { ...(map.get(l.id) || {}), ...l });
        }
        const merged = Array.from(map.values());
        updateLeadPhoneSet(merged);
        if (CallTracker?.setItem) {
          CallTracker.setItem(CACHED_LEADS_KEY, JSON.stringify(merged)).catch(() => {});
        }
        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch assigned leads from server:', err);
    }
    return this.getCachedLeads();
  },

  /**
   * Update leads directly from UI component state (e.g. LeadsScreen)
   */
  setMemoryLeads(leads: AssignedLead[]): void {
    const map = new Map<string, AssignedLead>();
    for (const l of cachedLeadsMemory) {
      map.set(l.id, l);
    }
    for (const l of leads) {
      map.set(l.id, { ...(map.get(l.id) || {}), ...l });
    }
    updateLeadPhoneSet(Array.from(map.values()));
  },

  /**
   * Check whether a phone number belongs to an assigned lead for this employee.
   * Compares 10-digit normalized numbers.
   */
  isAssignedLeadNumber(phoneNumber?: string | null): boolean {
    if (!phoneNumber) return false;
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized || normalized.length < 10) return false;
    return leadPhoneSet.has(normalized);
  },

  /**
   * Find matching assigned lead by phone number.
   */
  findAssignedLead(phoneNumber?: string | null): AssignedLead | undefined {
    if (!phoneNumber) return undefined;
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return undefined;
    return cachedLeadsMemory.find(l => normalizePhoneNumber(l.phoneNumber) === normalized);
  },
};
