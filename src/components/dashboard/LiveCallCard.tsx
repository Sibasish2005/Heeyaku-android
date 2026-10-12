import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { formatDuration } from '../../utils/formatters';

interface LiveCallCardProps {
  isOffhook: boolean;
  activeNumber: string;
  activeContactName?: string;
  currentDuration: number;
}

export const LiveCallCard: React.FC<LiveCallCardProps> = ({
  isOffhook,
  activeNumber,
  activeContactName,
  currentDuration,
}) => {
  return (
    <Card variant="default" style={[styles.liveCallCard, isOffhook && styles.liveCallCardConnected]}>
      <View style={styles.liveCallHeader}>
        <View style={styles.liveStatusRow}>
          <View style={[styles.pulseDot, !isOffhook && styles.pulseDotConnecting]} />
          <Text style={[styles.liveStatusText, isOffhook ? styles.textGreen : styles.textAmber]}>
            {isOffhook ? 'Active Call' : 'Calling Lead...'}
          </Text>
        </View>
        <Badge
          label={isOffhook ? 'Connected' : 'Ringing'}
          variant={isOffhook ? 'glow' : 'outline'}
          size="sm"
        />
      </View>

      <Text style={styles.liveCallerName} numberOfLines={1}>
        {activeContactName || activeNumber || 'Direct Dial'}
      </Text>
      {activeContactName ? (
        <Text style={styles.liveCallerNumber}>{activeNumber}</Text>
      ) : null}

      <View style={[styles.timerContainer, isOffhook && styles.timerContainerActive]}>
        <Text style={[styles.timerLabel, isOffhook && styles.timerLabelActive]}>
          {isOffhook ? 'Talk Time' : 'Waiting for answer...'}
        </Text>
        <Text style={[styles.timerValue, isOffhook && styles.timerValueActive]}>
          {formatDuration(currentDuration)}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  liveCallCard: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    backgroundColor: '#181A22',
    padding: 18,
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  liveCallCardConnected: {
    borderColor: 'rgba(34, 197, 94, 0.5)',
    backgroundColor: '#0F1E16',
    shadowColor: '#22C55E',
    shadowOpacity: 0.25,
  },
  liveCallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  pulseDotConnecting: {
    backgroundColor: '#EAB308',
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textGreen: {
    color: '#4ADE80',
  },
  textAmber: {
    color: '#FACC15',
  },
  liveCallerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  liveCallerNumber: {
    fontSize: 13,
    color: '#8E9BB5',
    marginTop: 2,
    fontWeight: '500',
  },
  timerContainer: {
    marginTop: 14,
    backgroundColor: '#1C2030',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262D42',
  },
  timerContainerActive: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: '#12261C',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E9BB5',
    letterSpacing: 0.8,
  },
  timerLabelActive: {
    color: '#86EFAC',
  },
  timerValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#E2E8F0',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  timerValueActive: {
    color: '#22C55E',
  },
});
