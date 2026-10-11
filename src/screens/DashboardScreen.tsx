import React, { useState, useCallback, useEffect } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CallRecord, CallState, EmployeeMetrics } from '../types';
import { COLORS } from '../theme/colors';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Icon } from '../components/common/Icon';
import { HeeyakuLogo } from '../components/common/HeeyakuLogo';
import { CallHistoryItemRow } from '../components/common/CallHistoryItemRow';
import { TodayHeroCard } from '../components/dashboard/TodayHeroCard';
import { LiveCallCard } from '../components/dashboard/LiveCallCard';

interface DashboardScreenProps {
  callState: CallState;
  activeNumber: string;
  activeContactName?: string;
  currentDuration: number;
  metrics: EmployeeMetrics;
  recentCalls: CallRecord[];
  isListening: boolean;
  onNavigateToCalls: () => void;
  onQuickCall: (number: string, name?: string) => void;
  onSelectCall: (call: CallRecord) => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  callState,
  activeNumber,
  activeContactName,
  currentDuration,
  metrics,
  recentCalls,
  isListening,
  onNavigateToCalls,
  onQuickCall,
  onSelectCall,
  onRefresh,
  refreshing = false,
}) => {
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const isOffhook = callState === 'OFFHOOK';
  const isRinging = callState === 'RINGING';
  const hasActiveCall = isOffhook || isRinging;

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setLocalRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.log('Error refreshing dashboard:', e);
    } finally {
      setLocalRefreshing(false);
    }
  }, [onRefresh]);

  // Synchronize with server immediately upon landing on dashboard
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={localRefreshing}
            onRefresh={handleRefresh}
            colors={['#38BDF8']}
            progressBackgroundColor="#1E293B"
            tintColor="#38BDF8"
          />
        ) : undefined
      }>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandingRow}>
          <HeeyakuLogo size={42} />
          <View style={styles.brandingTextContainer}>
            <Text style={styles.brandTitle}>HEEYAKU</Text>
            <Text style={styles.brandSubtitle}>BDA Workspace</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={[styles.headerStatusText, isListening ? styles.textActive : styles.textIdle]}>
            {isListening ? '• Tracking active' : '• Standby'}
          </Text>
        </View>
      </View>

      {/* Live Call Active Card */}
      {hasActiveCall && (
        <LiveCallCard
          isOffhook={isOffhook}
          activeNumber={activeNumber}
          activeContactName={activeContactName}
          currentDuration={currentDuration}
        />
      )}

      {/* Unified Today Performance Card */}
      <TodayHeroCard
        metrics={metrics}
        onNavigateToCalls={onNavigateToCalls}
      />

      {/* Recent Activity from Today */}
      <View style={styles.recentsHeaderRow}>
        <View style={styles.recentsTitleGroup}>
          <Text style={styles.sectionHeader}>{`TODAY'S CALL ACTIVITY (${recentCalls.length})`}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToCalls} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>
            Assigned Leads →
          </Text>
        </TouchableOpacity>
      </View>

      <Card variant="default" style={styles.recentsCard}>
        {recentCalls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="call" size={24} color="#38BDF8" />
            </View>
            <Text style={styles.emptyTitle}>No calls logged today yet</Text>
            <Text style={styles.emptySubtitle}>
              Outgoing calls made to leads will be automatically recorded here with verified real talk time.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onNavigateToCalls}
              style={styles.emptyActionButton}>
              <Text style={styles.emptyActionText}>Open Assigned Leads →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentCalls.slice(0, 10).map(item => (
            <CallHistoryItemRow
              key={item.id}
              item={item}
              onPressItem={onSelectCall}
              onQuickCall={onQuickCall}
            />
          ))
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 6,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandingTextContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textActive: {
    color: '#4ADE80',
  },
  textIdle: {
    color: '#94A3B8',
  },
  recentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  recentsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E9BB5',
    letterSpacing: 0.8,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  recentsCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#151824',
    borderColor: '#242A3E',
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#7B87A2',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 260,
  },
  emptyActionButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  emptyActionText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
});
