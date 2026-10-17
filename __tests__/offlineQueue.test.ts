import { offlineQueue, CallSyncPayload } from '../src/services/offlineQueue';
import { NativeModules } from 'react-native';

describe('offlineQueue service', () => {
  const sampleCall: CallSyncPayload = {
    id: 'call-1',
    leadId: 'lead-1',
    phoneNumber: '+919876543210',
    durationSeconds: 45,
    connected: true,
    outcomeId: 'CONNECTED',
    notes: 'Client interested in enterprise plan',
    startedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await offlineQueue.clearQueue();
  });

  it('enqueues calls and persists to storage', async () => {
    await offlineQueue.enqueueCalls([sampleCall]);
    
    expect(NativeModules.CallTracker.setItem).toHaveBeenCalledWith(
      'heeyaku_offline_call_queue',
      expect.stringContaining('lead-1'),
    );

    const size = await offlineQueue.getQueueSize();
    expect(size).toBe(1);
  });

  it('clears pending calls queue upon clearQueue', async () => {
    await offlineQueue.enqueueCalls([sampleCall]);
    await offlineQueue.clearQueue();

    const size = await offlineQueue.getQueueSize();
    expect(size).toBe(0);
    expect(NativeModules.CallTracker.setItem).toHaveBeenCalledWith(
      'heeyaku_offline_call_queue',
      JSON.stringify([]),
    );
  });
});
