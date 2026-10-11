import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmployeeMetrics } from '../../types';
import { formatVerboseDuration } from '../../utils/formatters';
import { Icon } from '../common/Icon';

interface TodayHeroCardProps {
  metrics: EmployeeMetrics;
  onNavigateToCalls?: () => void;
}

export const TodayHeroCard: React.FC<TodayHeroCardProps> = ({
  metrics,
  onNavigateToCalls,
}) => {
  const connectionRate = metrics.connectionRatePercent;
  const connectedCalls = metrics.totalConnected;
  const totalAttempts = metrics.totalAttempts;
  const talkTime = formatVerboseDuration(metrics.totalDurationSeconds);
  const avgDuration = formatVerboseDuration(metrics.averageDurationSeconds);
  const unansweredCalls = metrics.totalUnconnected;

  // Format today's date cleanly (e.g. "Sat, 19 Sep")
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.card}>
      {/* Top Meta Bar */}
      <View style={styles.topRow}>
        <View style={styles.dateGroup}>
          <Text style={styles.dateText}>{todayLabel.toUpperCase()}</Text>
          <View style={styles.dotSeparator} />
          <Text style={styles.shiftText}>Active Shift</Text>
        </View>

        <Text style={styles.syncStatusText}>Live</Text>
      </View>

      {/* Main Focus: Connected Talk Time */}
      <View style={styles.heroSection}>
        <Text style={styles.heroLabel}>Total Talk Time</Text>
        <Text style={styles.heroValue}>{talkTime}</Text>
      </View>

      {/* Clean 3-Column Metrics Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalAttempts}</Text>
          <Text style={styles.statLabel}>Dials</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={[styles.statValue, connectedCalls > 0 && styles.statValueSuccess]}>
            {connectedCalls}
          </Text>
          <Text style={styles.statLabel}>Connected</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={[styles.statValue, connectionRate > 0 && styles.statValueAccent]}>
            {connectionRate}%
          </Text>
          <Text style={styles.statLabel}>Answer Rate</Text>
        </View>
      </View>

      {/* Secondary Context Row: Only when there are calls */}
      {totalAttempts > 0 && (
        <View style={styles.secondaryRow}>
          <Text style={styles.secondaryText}>
            Avg call duration <Text style={styles.secondaryHighlight}>{avgDuration}</Text>
          </Text>
          <View style={styles.dotSeparator} />
          <Text style={styles.secondaryText}>
            Unanswered <Text style={styles.secondaryHighlight}>{unansweredCalls}</Text>
          </Text>
        </View>
      )}

      {/* Primary Action Button */}
      {onNavigateToCalls && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onNavigateToCalls}
          style={styles.actionButton}>
          <View style={styles.actionIconContainer}>
            <Icon name="call" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.actionButtonText}>Open Leads to Call</Text>
          <Icon name="arrow-outgoing" size={12} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#121520',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E2436',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#334155',
  },
  shiftText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  heroSection: {
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181C2A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#242B42',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  statValueSuccess: {
    color: '#34D399',
  },
  statValueAccent: {
    color: '#38BDF8',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#242B42',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A2030',
  },
  secondaryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  secondaryHighlight: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1E2436',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2C354E',
  },
  actionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
});
