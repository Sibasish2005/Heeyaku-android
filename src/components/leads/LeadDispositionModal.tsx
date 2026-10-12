import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADII, SPACING } from '../../theme/colors';
import { apiClient } from '../../services/apiClient';
import { assignedLeadsService } from '../../services/assignedLeadsService';

export interface LeadItem {
  id: string;
  leadCode: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  company?: string | null; // Course / Institution
  status: string;
  notes?: string | null;
  assignedAt?: string | null;
  updatedAt?: string | null;
  hasConnectedCall?: boolean;
  isProspect?: boolean;
  isReassigned?: boolean;
  assignedEmployeeName?: string | null;
  assignedEmployeeRole?: string | null;
  originalBdaName?: string | null;
}

interface LeadDispositionModalProps {
  visible: boolean;
  lead: LeadItem | null;
  thenOpenWhatsApp?: boolean;
  onClose: () => void;
  onSuccess: (updatedLead: LeadItem) => void;
  onMakeCall?: (phoneNumber: string, name: string) => void;
}

const CONNECTED_STATUS_IDS = new Set([
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'CALL_BACK',
  'CONVERTED',
  'NOT_INTERESTED',
]);

const STATUS_OPTIONS = [
  { id: 'CONTACTED', label: 'Contacted (Spoke with Student)', requiresCall: true },
  { id: 'INTERESTED', label: 'Interested (Wants Details/Demo)', requiresCall: true },
  { id: 'FOLLOW_UP', label: 'Follow Up Scheduled', requiresCall: true },
  { id: 'CALL_BACK', label: 'Student Requested Call Back', requiresCall: true },
  { id: 'CONVERTED', label: 'Converted / Admitted', requiresCall: true },
  { id: 'NOT_INTERESTED', label: 'Not Interested', requiresCall: true },
  { id: 'NO_ANSWER', label: 'No Answer / Ringing', requiresCall: false },
  { id: 'BUSY', label: 'Busy / Disconnected', requiresCall: false },
  { id: 'WRONG_NUMBER', label: 'Wrong Number', requiresCall: false },
];

export const LeadDispositionModal: React.FC<LeadDispositionModalProps> = ({
  visible,
  lead,
  thenOpenWhatsApp = false,
  onClose,
  onSuccess,
  onMakeCall,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('NO_ANSWER');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cachedLead = lead ? assignedLeadsService.findAssignedLead(lead.phoneNumber) : null;
  const hasConnectedCall = Boolean(lead?.hasConnectedCall || cachedLead?.hasConnectedCall);

  useEffect(() => {
    if (lead) {
      const cached = assignedLeadsService.findAssignedLead(lead.phoneNumber);
      const isConnected = Boolean(lead.hasConnectedCall || cached?.hasConnectedCall);
      if (isConnected) {
        setSelectedStatus(
          lead.status === 'NEW' || lead.status === 'ASSIGNED' ? 'CONTACTED' : lead.status
        );
      } else {
        // STRICT RULE: Unconnected leads NEVER default to Contacted!
        setSelectedStatus(
          lead.status === 'NEW' || lead.status === 'ASSIGNED' ? 'NO_ANSWER' : lead.status
        );
      }
      setNotes('');
      setError(null);
    }
  }, [lead]);

  if (!visible || !lead) return null;

  const handleSelectStatus = (optionId: string, requiresCall: boolean) => {
    if (requiresCall && !hasConnectedCall) {
      setError('Cannot mark as Contacted without a connected call (talk time > 0s). Please call the student first.');
      return;
    }
    setError(null);
    setSelectedStatus(optionId);
  };

  const handleSubmit = async () => {
    if (CONNECTED_STATUS_IDS.has(selectedStatus) && !hasConnectedCall) {
      setError('Cannot save Contacted or Interested status without a verified connected call.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await apiClient.submitLeadDisposition(lead.id, {
        status: selectedStatus,
        notes: notes.trim() || undefined,
      });

      if (!res.success || !res.lead) {
        setError(res.error || 'Failed to update lead KPI disposition.');
        setSubmitting(false);
        return;
      }

      // Update memory cache in assignedLeadsService so entire app has updated status immediately
      const matched = assignedLeadsService.findAssignedLead(lead.phoneNumber);
      if (matched) {
        matched.status = selectedStatus;
        if (notes.trim()) {
          matched.notes = matched.notes ? `${matched.notes}\n${notes.trim()}` : notes.trim();
        }
      }
      assignedLeadsService.refreshAssignedLeads().catch(() => {});

      onSuccess(res.lead);
      onClose();

      // If this disposition was triggered before WhatsApp redirection, trigger it now!
      if (thenOpenWhatsApp) {
        const cleanNumber = lead.phoneNumber.replace(/[^0-9]/g, '');
        const targetNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
        const url = `https://wa.me/${targetNumber}`;
        Linking.canOpenURL(url).then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Linking.openURL(`whatsapp://send?phone=${targetNumber}`);
          }
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Server connection error.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {thenOpenWhatsApp ? 'Update Status to Continue' : 'Update Lead Status'}
              </Text>
              <Text style={styles.leadSubtitle}>
                {lead.name} • {lead.phoneNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Unconnected Warning & Call CTA */}
          {!hasConnectedCall && (
            <View style={styles.noCallBanner}>
              <View style={styles.noCallHeader}>
                <Text style={styles.noCallTitle}>Call Required</Text>
                {onMakeCall && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      onMakeCall(lead.phoneNumber, lead.name);
                    }}
                    style={styles.callNowBtn}>
                    <Text style={styles.callNowBtnText}>Call Now</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.noCallText}>
                A connected call is required to set status to Contacted or Interested.
              </Text>
            </View>
          )}

          {thenOpenWhatsApp && (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>
                Record discussion outcome before opening WhatsApp.
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Status Selection */}
            <Text style={styles.fieldLabel}>Lead Status</Text>
            <View style={styles.optionsContainer}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.id;
                const isLocked = opt.requiresCall && !hasConnectedCall;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={isLocked ? 0.9 : 0.7}
                    onPress={() => handleSelectStatus(opt.id, opt.requiresCall)}
                    style={[
                      styles.statusOption,
                      isSelected && styles.statusOptionSelected,
                      isLocked && styles.statusOptionLocked,
                    ]}>
                    <View style={styles.statusOptionContent}>
                      <Text
                        style={[
                          styles.statusOptionText,
                          isSelected && styles.statusOptionTextSelected,
                          isLocked && styles.statusOptionTextLocked,
                        ]}>
                        {opt.label}
                      </Text>
                      {isLocked && (
                        <View style={styles.lockBadge}>
                          <Text style={styles.lockBadgeText}>Call needed</Text>
                        </View>
                      )}
                    </View>
                    {isSelected && !isLocked && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Notes (Optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add key discussion details..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} disabled={submitting} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}>
              {submitting ? (
                <ActivityIndicator color={COLORS.monoWhite} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {thenOpenWhatsApp ? 'Save & Open WhatsApp' : 'Save Status'}
                </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  leadSubtitle: {
    fontSize: 11,
    color: COLORS.brandCyan,
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  noCallBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  noCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  noCallTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  noCallText: {
    fontSize: 10,
    color: '#FCD34D',
    lineHeight: 14,
  },
  callNowBtn: {
    backgroundColor: COLORS.brandBlue,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADII.sm,
  },
  callNowBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.monoWhite,
  },
  noticeBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  noticeText: {
    color: COLORS.brandCyan,
    fontSize: 11,
    lineHeight: 15,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: RADII.sm,
  },
  errorText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '500',
  },
  scrollArea: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    gap: 6,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    marginRight: 8,
  },
  statusOptionSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderColor: COLORS.brandBlue,
  },
  statusOptionLocked: {
    opacity: 0.55,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusOptionTextSelected: {
    color: COLORS.monoWhite,
    fontWeight: '700',
  },
  statusOptionTextLocked: {
    color: COLORS.textTertiary,
  },
  lockBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
  },
  checkIcon: {
    color: COLORS.brandCyan,
    fontSize: 13,
    fontWeight: '900',
  },
  notesInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 12,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.brandBlue,
    borderRadius: RADII.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.monoWhite,
    fontSize: 12,
    fontWeight: '700',
  },
});
