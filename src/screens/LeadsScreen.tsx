import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  NativeModules,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADII, SPACING } from '../theme/colors';
import { Icon } from '../components/common/Icon';
import { Card } from '../components/common/Card';
import { apiClient } from '../services/apiClient';
import { LeadDispositionModal, LeadItem } from '../components/leads/LeadDispositionModal';
import { assignedLeadsService, CACHED_LEADS_KEY } from '../services/assignedLeadsService';

const { CallTracker } = NativeModules;

interface LeadsScreenProps {
  onMakeCall: (phoneNumber: string, contactName?: string) => void;
}

const FILTER_STATUSES = ['ALL', 'NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'CONVERTED'];

export const LeadsScreen: React.FC<LeadsScreenProps> = ({ onMakeCall }) => {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for KPI
  const [activeDispositionLead, setActiveDispositionLead] = useState<LeadItem | null>(null);
  const isFetchingRef = useRef(false);
  const leadsCountRef = useRef(0);
  leadsCountRef.current = leads.length;

  // 1. Instant Cache Hydration on Mount
  useEffect(() => {
    async function loadCachedLeads() {
      try {
        if (CallTracker?.getItem) {
          const cached = await CallTracker.getItem(CACHED_LEADS_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLeads(parsed);
              assignedLeadsService.setMemoryLeads(parsed);
              setLoading(false);
            }
          }
        }
      } catch (e) {
        console.log('Error reading cached leads:', e);
      }
    }
    loadCachedLeads();
  }, []);

  const fetchLeads = useCallback(async (isRefresh = false, isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isRefresh) setRefreshing(true);
    else if (isInitial && leadsCountRef.current === 0) setLoading(true);

    try {
      const res = await apiClient.getAssignedLeads();
      if (res.success && Array.isArray(res.leads)) {
        setLeads((prev) => {
          const map = new Map<string, LeadItem>();
          for (const l of prev) {
            map.set(l.id, l);
          }
          for (const l of res.leads) {
            map.set(l.id, { ...(map.get(l.id) || {}), ...l });
          }
          const merged = Array.from(map.values());
          assignedLeadsService.setMemoryLeads(merged);
          if (CallTracker?.setItem) {
            CallTracker.setItem(CACHED_LEADS_KEY, JSON.stringify(merged)).catch(() => {});
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn('Failed to load assigned leads:', err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchLeads(false, true);
    const interval = setInterval(() => {
      fetchLeads(false, false);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((item) => {
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.phoneNumber.includes(q) ||
        item.leadCode.toLowerCase().includes(q) ||
        (item.company && item.company.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const handleLeadUpdated = (updated: LeadItem) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  const handleWhatsAppPress = (lead: LeadItem) => {
    const isPendingCall = !lead.hasConnectedCall || lead.status === 'NEW' || lead.status === 'ASSIGNED';
    if (isPendingCall) {
      Alert.alert(
        'Call Required Before WhatsApp',
        'Please call and connect with the student first through Heeyaku (talk time > 0s). WhatsApp is unlocked once a connected discussion is recorded.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call Student Now',
            onPress: () => {
              onMakeCall(lead.phoneNumber, lead.name);
            },
          },
        ]
      );
      return;
    }

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
  };

  const handleCallPress = (lead: LeadItem) => {
    onMakeCall(lead.phoneNumber, lead.name);
  };


  const handleDispositionOnly = (lead: LeadItem) => {
    setActiveDispositionLead(lead);
  };

  const renderLeadCard = ({ item }: { item: LeadItem }) => {
    const isNew = item.status === 'NEW' || item.status === 'ASSIGNED';
    const isContacted = item.status === 'CONTACTED';
    const isConverted = item.status === 'CONVERTED';
    const isInterested = item.status === 'INTERESTED';
    const isFollowUp = item.status === 'FOLLOW_UP';
    const isCallBack = item.status === 'CALL_BACK';
    const hasConnectedCall = Boolean(item.hasConnectedCall);

    // WhatsApp button is enabled strictly and ONLY if there is a verified connected call
    const isWhatsAppDisabled = !hasConnectedCall || isNew || ['NO_ANSWER', 'BUSY', 'WRONG_NUMBER'].includes(item.status);

    return (
      <Card variant="default" style={styles.leadCard}>
        {/* Contacted Watermark Stamp: ALWAYS shown if verified connected call exists */}
        {hasConnectedCall && (
          <View style={styles.contactedWatermark} pointerEvents="none">
            <Text style={styles.contactedWatermarkText}>CONTACTED</Text>
          </View>
        )}

        {/* Reassigned / Escalated status banner */}
        {item.isReassigned && (
          <View style={styles.reassignedBanner}>
            <Text style={styles.reassignedBannerText}>
              ⚡ Escalated to {item.assignedEmployeeName || 'Team Lead'} (Your Call & KPI recorded)
            </Text>
          </View>
        )}

        {/* Top Meta Row */}
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.leadName}>{item.name}</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{item.leadCode}</Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleDispositionOnly(item)}
            style={[
              styles.statusPill,
              isNew && styles.statusPillNew,
              isContacted && styles.statusPillContacted,
              isConverted && styles.statusPillConverted,
              isInterested && styles.statusPillInterested,
              isFollowUp && styles.statusPillFollowUp,
              isCallBack && styles.statusPillCallBack,
            ]}>
            <Text style={styles.statusPillText}>{item.status}</Text>
          </TouchableOpacity>
        </View>

        {/* Course / Program */}
        {item.company ? (
          <Text style={styles.leadCourse}>{item.company}</Text>
        ) : (
          <Text style={styles.leadCourseSubtle}>General Inquiry</Text>
        )}

        {/* Phone number */}
        <Text style={styles.leadPhone}>📞 {item.phoneNumber}</Text>

        {/* Action Buttons: Call & WhatsApp */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleCallPress(item)}
            style={styles.callButton}>
            <Icon name="call" size={14} color={COLORS.monoWhite} />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isWhatsAppDisabled}
            onPress={() => handleWhatsAppPress(item)}
            style={[
              styles.whatsappButton,
              isWhatsAppDisabled && styles.whatsappButtonDisabled,
            ]}>
            <Icon
              name="whatsapp"
              size={15}
              color={isWhatsAppDisabled ? COLORS.monoMuted : COLORS.monoWhite}
            />
            <Text
              style={[
                styles.whatsappButtonText,
                isWhatsAppDisabled && styles.whatsappButtonTextDisabled,
              ]}>
              {isWhatsAppDisabled ? 'WhatsApp (Disabled)' : 'WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Header Section */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Assigned Leads</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredLeads.length} leads</Text>
          </View>
        </View>

        {/* Search input */}
        <View style={styles.searchBox}>
          <Icon name="search" size={14} color={COLORS.monoMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by student, phone or course..."
            placeholderTextColor={COLORS.monoMuted}
            style={styles.searchInput}
          />
        </View>

        {/* Horizontal Status Chips */}
        <View style={styles.chipRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={FILTER_STATUSES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = statusFilter === item;
              return (
                <TouchableOpacity
                  onPress={() => setStatusFilter(item)}
                  style={[styles.chip, isSelected && styles.chipSelected]}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Main Leads List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.brandCyan} size="large" />
          <Text style={styles.loadingText}>Loading assigned leads...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLeads(true)}
              tintColor={COLORS.brandCyan}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'Try adjusting your search query.' : 'You have no assigned leads in this filter.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Manual Disposition Modal if clicked directly */}
      <LeadDispositionModal
        visible={Boolean(activeDispositionLead)}
        lead={activeDispositionLead}
        onClose={() => {
          setActiveDispositionLead(null);
        }}
        onSuccess={handleLeadUpdated}
        onMakeCall={(phone, name) => onMakeCall(phone, name)}
      />
    </View>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandCyan,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    height: 40,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    padding: 0,
  },
  chipRow: {
    marginBottom: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  chipSelected: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandBlue,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.monoMuted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.monoWhite,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 80,
  },
  leadCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  contactedWatermark: {
    position: 'absolute',
    right: 14,
    top: 36,
    transform: [{ rotate: '-12deg' }],
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    zIndex: 1,
  },
  contactedWatermarkText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    color: 'rgba(52, 211, 153, 0.55)',
    textTransform: 'uppercase',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  leadName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  codeBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.monoMuted,
  },
  statusPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
  },
  statusPillNew: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusPillContacted: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  statusPillConverted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusPillInterested: {
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
  },
  statusPillFollowUp: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  statusPillCallBack: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  reassignedBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  reassignedBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.monoWhite,
  },
  leadCourse: {
    fontSize: 12,
    color: COLORS.brandCyan,
    fontWeight: '600',
    marginBottom: 2,
  },
  leadCourseSubtle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  leadPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 4,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 9,
    borderRadius: RADII.sm,
  },
  callButtonText: {
    color: COLORS.monoWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16A34A', // WhatsApp Emerald Green
    paddingVertical: 9,
    borderRadius: RADII.sm,
  },
  whatsappButtonDisabled: {
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#262A36',
    opacity: 0.6,
  },
  whatsappButtonTextDisabled: {
    color: COLORS.monoMuted,
  },
  whatsappButtonText: {
    color: COLORS.monoWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
