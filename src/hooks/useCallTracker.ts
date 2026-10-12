import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { CallRecord } from '../types';
import {
  useCallFilter,
  useCallHistory,
  useCallOutcomes,
  useCallPermissions,
  useTelephonyState,
} from './tracker';
import { apiClient } from '../services/apiClient';
import { offlineQueue } from '../services/offlineQueue';
import { assignedLeadsService } from '../services/assignedLeadsService';

export * from './tracker';

/**
 * High-level composed hook for HEEYAKU Call Tracking.
 * Modularized across sub-hooks in `./tracker/`:
 * - useCallPermissions: Runtime telephony & call log permissions
 * - useCallHistory: System call logs and native persistent app calls
 * - useCallOutcomes: Call disposition outcomes and modal state
 * - useCallFilter: Search and filter chips for call history
 * - useTelephonyState: Native telephony listeners, duration timer, and dialing
 */
export function useCallTracker() {
  // 1. Permissions & Status
  const {
    permissionGranted,
    statusMessage,
    setStatusMessage,
    checkPermissions,
    requestPermissions: requestPermsBase,
  } = useCallPermissions();

  // 2. Disposition Outcomes
  const {
    pendingOutcomeCall,
    setPendingOutcomeCall,
    saveCallOutcome: saveOutcomeBase,
    dismissOutcomeModal,
    getOutcomeForCall,
  } = useCallOutcomes();

  // 3. Call History & Native App Calls
  const onLatestCallFoundRef = useRef<((call: CallRecord) => void) | undefined>(undefined);
  const handleLatestCallFound = useCallback((call: CallRecord) => {
    onLatestCallFoundRef.current?.(call);
  }, []);

  const {
    callHistory,
    setCallHistory,
    appCalls,
    setAppCalls,
    todayCalls,
    setTodayCalls,
    todayMetrics,
    lifetimeMetrics,
    isLoadingHistory,
    loadAppCalls,
    loadCallHistory,
  } = useCallHistory(getOutcomeForCall, handleLatestCallFound);

  const loadCallHistoryRef = useRef(loadCallHistory);
  useEffect(() => {
    loadCallHistoryRef.current = loadCallHistory;
  });

  // 4. Filtering & Search (strictly on appCalls as per Option A)
  const {
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    filteredHistory,
  } = useCallFilter(appCalls);

  // 5. Telephony state, dialing & events
  const onCallEndedEventRef = useRef<(completedRecord: CallRecord) => void>(() => {});
  useEffect(() => {
    onCallEndedEventRef.current = (completedRecord: CallRecord) => {
      // STRICT APP FILTER: Only process calls initiated within the HEEYAKU app
      if (!completedRecord.isAppInitiated) {
        console.log('[CallTracker] Non-app call received. Discarding.');
        return;
      }

      const callPhone = completedRecord.phoneNumber || completedRecord.number || '';
      const matchedLead = assignedLeadsService.findAssignedLead(callPhone);

      // Attach assigned lead metadata if available
      const enrichedRecord: CallRecord = {
        ...completedRecord,
        leadId: completedRecord.leadId || matchedLead?.id,
        contactName: completedRecord.contactName || matchedLead?.name || completedRecord.name,
        name: completedRecord.name || matchedLead?.name || completedRecord.contactName,
        isAppInitiated: true,
      };

      // 1. Update local callHistory with assigned lead call
      setCallHistory(prev => {
        const filtered = prev.filter(c => c.id !== enrichedRecord.id);
        return [enrichedRecord, ...filtered.slice(0, 199)];
      });

      // 2. IMMEDIATE BACKEND PERSISTENCE:
      // Strictly sync ONLY assigned lead calls with real connected duration
      const initialDuration = enrichedRecord.durationSeconds ?? enrichedRecord.duration ?? 0;
      const initialConnected = Boolean(enrichedRecord.connected || initialDuration > 0);
      const syncPayload = {
        id: enrichedRecord.id,
        leadId: enrichedRecord.leadId,
        phoneNumber: enrichedRecord.phoneNumber || enrichedRecord.number,
        contactName: enrichedRecord.contactName || enrichedRecord.name,
        callType: enrichedRecord.callType || 'OUTGOING',
        durationSeconds: initialConnected ? Math.max(initialDuration, 1) : 0,
        connected: initialConnected,
        outcomeId: enrichedRecord.outcomeId,
        outcomeLabel: enrichedRecord.outcomeLabel,
        notes: enrichedRecord.notes,
        startedAt: enrichedRecord.startedAt || enrichedRecord.date,
        endedAt: enrichedRecord.endedAt,
      };

      apiClient.syncCalls([syncPayload])
        .then(res => {
          if (!res || !res.success) {
            offlineQueue.enqueueCalls([syncPayload]).catch(() => {});
          }
        })
        .catch((e: unknown) => {
          console.log('Immediate call sync err, queued offline:', e);
          offlineQueue.enqueueCalls([syncPayload]).catch(() => {});
        });

      // 3. Update appCalls and todayCalls immediately so Home screen reflects new call instantly
      setAppCalls(prev => {
        const filtered = prev.filter(c => c.id !== enrichedRecord.id);
        return [enrichedRecord, ...filtered];
      });

      setTodayCalls(prev => {
        const filtered = prev.filter(c => c.id !== enrichedRecord.id);
        return [enrichedRecord, ...filtered];
      });

      // Set the popup modal target (mandatory KPI)
      setPendingOutcomeCall(enrichedRecord);
    };
  });
  const handleCallEndedEvent = useCallback((completedRecord: CallRecord) => {
    onCallEndedEventRef.current(completedRecord);
  }, []);

  const handleCallEndedReloadHistory = useCallback(() => {
    loadCallHistoryRef.current(false);
  }, []);

  const {
    callState,
    isCallActive,
    phoneNumber,
    setPhoneNumber,
    activeNumber,
    activeContactName,
    currentDuration,
    lastCall,
    setLastCall,
    isListening,
    startCallListener,
    makeCall,
  } = useTelephonyState({
    onCallEndedEvent: handleCallEndedEvent,
    onCallEndedReloadHistory: handleCallEndedReloadHistory,
    onStatusMessage: setStatusMessage,
  });

  // Attach setLastCall to onLatestCallFoundRef
  useEffect(() => {
    onLatestCallFoundRef.current = (latest: CallRecord) => {
      setLastCall(prev => prev ?? latest);
    };
  });

  // Request permissions wrapper: automatically starts listener and loads history on grant
  const requestPermissions = useCallback(async () => {
    return requestPermsBase(() => {
      startCallListener();
      loadCallHistoryRef.current(true);
    });
  }, [requestPermsBase, startCallListener]);

  // Save call outcome handler: updates outcome in appCalls, callHistory, and lastCall, AND syncs to backend!
  const saveCallOutcome = useCallback(
    async (callId: string, outcomeId: string, notes?: string) => {
      const targetCall =
        pendingOutcomeCall?.id === callId
          ? pendingOutcomeCall
          : appCalls.find(c => c.id === callId) ||
            appCalls[0] ||
            pendingOutcomeCall;

      saveOutcomeBase(callId, outcomeId, notes, (_id, outcomeLabel, finalNotes) => {
        // 1. Update appCalls immediately with outcome disposition
        setAppCalls(prev => {
          let matched = false;
          const updated = prev.map(item => {
            const isTarget =
              item.id === callId ||
              (pendingOutcomeCall && item.id === pendingOutcomeCall.id);
            if (isTarget) {
              matched = true;
              return { ...item, outcomeId, outcomeLabel, notes: finalNotes };
            }
            return item;
          });

          // Fallback: If exact ID didn't match, update most recent call in appCalls
          if (!matched && prev.length > 0) {
            return [
              { ...prev[0], outcomeId, outcomeLabel, notes: finalNotes },
              ...prev.slice(1),
            ];
          }
          if (!matched && pendingOutcomeCall) {
            return [
              { ...pendingOutcomeCall, outcomeId, outcomeLabel, notes: finalNotes },
            ];
          }
          return updated;
        });

        // 2. Update callHistory
        setCallHistory(prev => {
          let matched = false;
          const updated = prev.map(item => {
            const isTarget =
              item.id === callId ||
              (pendingOutcomeCall && item.id === pendingOutcomeCall.id);
            if (isTarget) {
              matched = true;
              return { ...item, outcomeId, outcomeLabel, notes: finalNotes };
            }
            return item;
          });
          if (!matched && prev.length > 0) {
            return [
              { ...prev[0], outcomeId, outcomeLabel, notes: finalNotes },
              ...prev.slice(1),
            ];
          }
          return updated;
        });

        // 3. Update lastCall
        setLastCall(prev =>
          prev ? { ...prev, outcomeId, outcomeLabel, notes: finalNotes } : null
        );

        // 4. Update assigned lead in memory cache
        const callNum = targetCall?.phoneNumber || targetCall?.number;
        const matchedLead = assignedLeadsService.findAssignedLead(callNum);
        const targetDuration = targetCall?.durationSeconds ?? targetCall?.duration ?? 0;
        const isCallConnected = Boolean(targetCall?.connected || targetDuration > 0);

        if (matchedLead) {
          const connectedStatusSet = new Set(['CONTACTED', 'INTERESTED', 'CONVERTED', 'FOLLOW_UP', 'CALL_BACK']);
          const upperOutcome = outcomeId.toUpperCase();
          const hasPriorOrCurrentConnected = isCallConnected || Boolean(matchedLead.hasConnectedCall);

          if (hasPriorOrCurrentConnected) {
            matchedLead.hasConnectedCall = true;
            matchedLead.status = upperOutcome;
          } else {
            // Unconnected calls without any prior connected history cannot transition to Contacted or Interested
            matchedLead.status = connectedStatusSet.has(upperOutcome) ? 'NO_ANSWER' : upperOutcome;
          }

          if (finalNotes?.trim()) {
            matchedLead.notes = matchedLead.notes
              ? `${matchedLead.notes}\n${finalNotes.trim()}`
              : finalNotes.trim();
          }
        }

        // 5. Resync app calls from native storage after short delay for persistence consistency
        setTimeout(() => {
          loadAppCalls();
        }, 300);
      });

      // 6. Backend Sync: Persist call & outcome to PostgreSQL database
      if (targetCall) {
        const callNum = targetCall.phoneNumber || targetCall.number;
        const matchedLead = assignedLeadsService.findAssignedLead(callNum);
        const targetDuration = targetCall.durationSeconds ?? targetCall.duration ?? 0;
        const isCallConnected = Boolean(targetCall.connected || targetDuration > 0);
        const connectedOutcomes = ['contacted', 'interested', 'converted', 'follow_up', 'call_back', 'not_interested', 'not_qualified'];
        const hasPriorOrCurrentConnected = isCallConnected || Boolean(matchedLead?.hasConnectedCall);
        const safeOutcomeId = (!hasPriorOrCurrentConnected && connectedOutcomes.includes(outcomeId.toLowerCase()))
          ? 'no_answer'
          : outcomeId;

        const syncPayload = {
          id: callId,
          leadId: targetCall.leadId || matchedLead?.id,
          phoneNumber: callNum,
          contactName: targetCall.contactName || targetCall.name || matchedLead?.name,
          callType: targetCall.callType || 'OUTGOING',
          durationSeconds: isCallConnected
            ? Math.max(targetDuration, 1)
            : 0,
          connected: isCallConnected,
          outcomeId: safeOutcomeId,
          outcomeLabel: safeOutcomeId,
          notes: notes?.trim() || undefined,
          startedAt: targetCall.startedAt || targetCall.date,
          endedAt: targetCall.endedAt,
        };
        try {
          const res = await apiClient.syncCalls([syncPayload]);
          if (!res?.success) {
            await offlineQueue.enqueueCalls([syncPayload]);
          } else {
            console.log('Call & KPI successfully synced to backend:', res);
            assignedLeadsService.refreshAssignedLeads().catch(() => {});
          }
        } catch (syncErr) {
          console.warn('Failed to sync call to backend, queued offline:', syncErr);
          await offlineQueue.enqueueCalls([syncPayload]);
        }
      }
    },
    [appCalls, loadAppCalls, pendingOutcomeCall, saveOutcomeBase, setAppCalls, setCallHistory, setLastCall]
  );


  // Initial mount: check permissions and start listener (runs strictly ONCE)
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      try {
        const status = await checkPermissions();
        if (status === 'granted') {
          await startCallListener();
          await loadCallHistoryRef.current(false);
          setStatusMessage('System active & tracking');
        } else {
          await requestPermissions();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setStatusMessage(`Init warning: ${message}`);
      }
    };

    init();
    // Flush any pending calls from previous offline sessions
    offlineQueue.flush().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor AppState: Re-sync call history & sync to backend on return
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          console.log('App resumed, syncing latest call history...');
          loadCallHistoryRef.current(false);
          // Flush offline queue on resume
          offlineQueue.flush().catch(() => {});

          // Only sync calls that have not been synced yet
          if (appCalls && appCalls.length > 0) {
            const unsyncedCalls = appCalls.filter(c => !c.synced).slice(0, 10);
            if (unsyncedCalls.length > 0) {
              const payload = unsyncedCalls.map(c => ({
                id: c.id,
                phoneNumber: c.phoneNumber || c.number,
                contactName: c.contactName || c.name,
                callType: c.callType || 'OUTGOING',
                durationSeconds: c.durationSeconds ?? c.duration ?? 0,
                connected: c.connected,
                outcomeId: c.outcomeId,
                outcomeLabel: c.outcomeLabel,
                notes: c.notes,
                startedAt: c.startedAt || c.date,
                endedAt: c.endedAt,
              }));
              apiClient.syncCalls(payload)
                .then(res => {
                  if (!res?.success) offlineQueue.enqueueCalls(payload);
                })
                .catch(() => offlineQueue.enqueueCalls(payload));
            }
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [appCalls]);

  // Periodic background synchronization with authoritative database every 25 seconds
  const isPeriodicSyncingRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isPeriodicSyncingRef.current) return;
      isPeriodicSyncingRef.current = true;
      try {
        await loadCallHistoryRef.current(false);
        await offlineQueue.flush();
      } catch (err) {
        // Silent catch for network jitter
      } finally {
        isPeriodicSyncingRef.current = false;
      }
    }, 25000);

    return () => clearInterval(interval);
  }, []);


  return {
    callState,
    phoneNumber,
    setPhoneNumber,
    activeNumber,
    activeContactName,
    currentDuration,
    lastCall,
    callHistory,
    appCalls,
    todayCalls,
    todayMetrics,
    lifetimeMetrics,
    isLoadingHistory,
    statusMessage,
    permissionGranted,
    isListening,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    filteredHistory,
    isCallActive,
    pendingOutcomeCall,
    setPendingOutcomeCall,
    saveCallOutcome,
    dismissOutcomeModal,
    loadCallHistory,
    loadAppCalls,
    requestPermissions,
    startCallListener,
    makeCall,
  };
}
