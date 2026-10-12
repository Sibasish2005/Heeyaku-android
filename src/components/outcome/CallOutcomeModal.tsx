import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CallRecord } from '../../types';
import { COLORS } from '../../theme/colors';
import { getOutcomesForCall } from '../../config/outcomes';
import { formatVerboseDuration } from '../../utils/formatters';

interface CallOutcomeModalProps {
  call: CallRecord | null;
  visible: boolean;
  onSave: (callId: string, outcomeId: string, notes?: string) => Promise<void> | void;
  onDismiss?: () => void;
}

export const CallOutcomeModal: React.FC<CallOutcomeModalProps> = ({
  call,
  visible,
  onSave,
}) => {
  const duration = call ? (call.durationSeconds ?? call.duration ?? 0) : 0;
  const initialConnected = Boolean(call?.connected || duration > 0);
  const [callWasAnswered, setCallWasAnswered] = useState<boolean>(initialConnected);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (call) {
      const dur = call.durationSeconds ?? call.duration ?? 0;
      const isConn = Boolean(call.connected || dur > 0);
      setCallWasAnswered(isConn);
      if (!isConn) {
        setSelectedOutcomeId('no_answer');
      } else {
        setSelectedOutcomeId('contacted');
      }
      setNotes('');
    }
  }, [call?.id, call?.connected, call?.duration, call?.durationSeconds]);

  if (!call) return null;

  const isConnected = callWasAnswered;
  const outcomes = getOutcomesForCall(isConnected);

  const selectedOutcome = outcomes.find(o => o.id === selectedOutcomeId);
  const canSubmit = Boolean(selectedOutcomeId) && !submitting;

  const handleToggleAnswered = (answered: boolean) => {
    setCallWasAnswered(answered);
    if (answered) {
      if (!selectedOutcomeId || selectedOutcomeId === 'no_answer' || selectedOutcomeId === 'busy' || selectedOutcomeId === 'wrong_number') {
        setSelectedOutcomeId('contacted');
      }
    } else {
      setSelectedOutcomeId('no_answer');
    }
  };

  const handleSave = async () => {
    if (!selectedOutcomeId || submitting) return;
    setSubmitting(true);
    try {
      if (callWasAnswered) {
        call.connected = true;
        if (!call.durationSeconds && !call.duration) {
          call.durationSeconds = 1;
          call.duration = 1;
        }
      } else {
        call.connected = false;
        call.durationSeconds = 0;
        call.duration = 0;
      }
      await onSave(call.id, selectedOutcomeId, notes.trim());
      setSelectedOutcomeId(null);
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        // Enforce mandatory completion: Back button cannot dismiss without KPI
      }}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Call Outcome</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {call.contactName || call.phoneNumber || call.number}
              </Text>
            </View>

            <View style={[styles.statusBadge, isConnected ? styles.statusBadgeConnected : styles.statusBadgeUnconnected]}>
              <Text style={[styles.statusText, isConnected ? styles.statusTextConnected : styles.statusTextUnconnected]}>
                {isConnected ? `Connected • ${formatVerboseDuration(Math.max(duration, 1))}` : 'Not Connected'}
              </Text>
            </View>
          </View>

          {/* Answered / Not Answered Tab Bar */}
          <View style={styles.connectionToggleContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleAnswered(true)}
              style={[styles.connectionTab, isConnected && styles.connectionTabActive]}>
              <Text style={[styles.connectionTabText, isConnected && styles.connectionTabTextActive]}>
                Connected
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleAnswered(false)}
              style={[styles.connectionTab, !isConnected && styles.connectionTabUnconnectedActive]}>
              <Text style={[styles.connectionTabText, !isConnected && styles.connectionTabTextActive]}>
                Unanswered / Busy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mandatory Gate Notice Banner */}
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>
              {isConnected
                ? 'Record discussion outcome to update lead status and metrics.'
                : 'Call ended without connection. Select telecom outcome.'}
            </Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Outcome Selection Grid */}
            <Text style={styles.sectionLabel}>SELECT OUTCOME</Text>
            <View style={styles.chipGrid}>
              {outcomes.map(outcome => {
                const isSelected = selectedOutcomeId === outcome.id;
                return (
                  <TouchableOpacity
                    key={outcome.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedOutcomeId(outcome.id)}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}>
                      {outcome.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes Input */}
            <Text style={styles.sectionLabel}>
              DISCUSSION NOTES {selectedOutcome?.requiresNotes ? '(REQUIRED)' : '(OPTIONAL)'}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add key highlights, customer feedback or next steps..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
          </ScrollView>

          {/* Actions: Mandatory Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={!canSubmit}
              style={[
                styles.saveButton,
                !canSubmit && styles.saveButtonDisabled,
              ]}>
              {submitting ? (
                <ActivityIndicator color={COLORS.monoWhite} size="small" />
              ) : (
                <Text style={styles.saveText}>Save KPI & Continue →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderMuted,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.monoWhite,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.brandCyan,
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    backgroundColor: COLORS.surfaceSubtle,
  },
  statusBadgeConnected: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgeUnconnected: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.monoSilver,
  },
  statusTextConnected: {
    color: '#34D399',
  },
  statusTextUnconnected: {
    color: '#FBBF24',
  },
  connectionToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  connectionTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
  },
  connectionTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  connectionTabUnconnectedActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#F59E0B',
  },
  connectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.monoSilver,
  },
  connectionTabTextActive: {
    color: COLORS.monoWhite,
    fontWeight: '800',
  },
  noticeBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  noticeText: {
    color: '#38BDF8',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.textTertiary,
    marginBottom: 10,
    marginTop: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandCyan,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.monoWhite,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
    backgroundColor: COLORS.surfaceHighlight,
  },
  saveText: {
    color: COLORS.monoWhite,
    fontWeight: '700',
    fontSize: 14,
  },
});
