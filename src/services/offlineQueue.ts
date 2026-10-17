import { NativeModules } from 'react-native';
import { apiClient } from './apiClient';
import { assignedLeadsService } from './assignedLeadsService';

const { CallTracker } = NativeModules;
const QUEUE_STORAGE_KEY = 'heeyaku_offline_call_queue';

export interface CallSyncPayload {
  id?: string;
  leadId?: string;
  phoneNumber?: string;
  contactName?: string | null;
  callType?: string;
  durationSeconds?: number;
  connected?: boolean;
  outcomeId?: string | null;
  outcomeLabel?: string | null;
  notes?: string | null;
  startedAt?: string | number | Date;
  endedAt?: string | number | Date | null;
  retryCount?: number;
}

let memoryQueue: CallSyncPayload[] = [];
let isFlushing = false;

async function loadQueueFromStorage(): Promise<CallSyncPayload[]> {
  try {
    if (CallTracker?.getItem) {
      const raw = await CallTracker.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryQueue = parsed;
          return memoryQueue;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load offline call queue from native storage:', err);
  }
  return memoryQueue;
}

async function saveQueueToStorage(queue: CallSyncPayload[]): Promise<void> {
  memoryQueue = queue;
  try {
    if (CallTracker?.setItem) {
      await CallTracker.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (err) {
    console.warn('Failed to save offline call queue to native storage:', err);
  }
}

export const offlineQueue = {
  /**
   * Add one or more calls to the offline pending queue.
   */
  async enqueueCalls(calls: CallSyncPayload[]): Promise<void> {
    if (!calls || calls.length === 0) return;
    const currentQueue = await loadQueueFromStorage();

    // STRICT: Only allow calls assigned to leads into the offline sync queue
    const assignedOnly = calls.filter(c => {
      return Boolean(c.leadId || assignedLeadsService.isAssignedLeadNumber(c.phoneNumber));
    });
    if (assignedOnly.length === 0) return;

    const updated = [...currentQueue];
    for (const call of assignedOnly) {
      const callId = call.id;
      const callNum = call.phoneNumber;
      const existingIdx = updated.findIndex(item => {
        if (callId && item.id && callId === item.id) return true;
        if (callNum && item.phoneNumber === callNum && item.startedAt === call.startedAt) return true;
        return false;
      });

      if (existingIdx >= 0) {
        // Update existing item with latest outcome or duration
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...call,
          durationSeconds: Math.max(updated[existingIdx].durationSeconds ?? 0, call.durationSeconds ?? 0),
          retryCount: updated[existingIdx].retryCount ?? 0,
        };
      } else {
        updated.push({
          ...call,
          retryCount: 0,
        });
      }
    }

    // Keep max 200 items in queue to prevent unbounded storage
    const trimmed = updated.slice(-200);
    await saveQueueToStorage(trimmed);
  },

  /**
   * Attempt to flush all queued calls to the backend.
   */
  async flush(): Promise<{ flushed: number; remaining: number }> {
    if (isFlushing) return { flushed: 0, remaining: memoryQueue.length };
    isFlushing = true;

    try {
      const queue = await loadQueueFromStorage();
      if (queue.length === 0) {
        return { flushed: 0, remaining: 0 };
      }

      const res = await apiClient.syncCalls(queue);

      if (res.success) {
        // All calls synced successfully, clear queue
        await saveQueueToStorage([]);
        return { flushed: queue.length, remaining: 0 };
      } else if (res.isUnauthorized) {
        // Unauthorized: leave queue intact until user re-authenticates
        return { flushed: 0, remaining: queue.length };
      } else {
        // Failed due to network error or server issue: increment retry counters
        const updated = queue
          .map(item => ({
            ...item,
            retryCount: (item.retryCount ?? 0) + 1,
          }))
          .filter(item => (item.retryCount ?? 0) <= 50); // Drop if failed > 50 times

        await saveQueueToStorage(updated);
        return { flushed: 0, remaining: updated.length };
      }
    } catch (err) {
      console.warn('Offline call queue flush error:', err);
      return { flushed: 0, remaining: memoryQueue.length };
    } finally {
      isFlushing = false;
    }
  },

  /**
   * Get count of pending unsynced calls.
   */
  async getQueueSize(): Promise<number> {
    const queue = await loadQueueFromStorage();
    return queue.length;
  },

  /**
   * Clears all queued items from memory and storage.
   */
  async clearQueue(): Promise<void> {
    await saveQueueToStorage([]);
  },
};

