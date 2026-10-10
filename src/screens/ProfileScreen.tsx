import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  NativeModules,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';
import { HeeyakuLogo } from '../components/common/HeeyakuLogo';
import { apiClient } from '../services/apiClient';
import { authStorage, EmployeeProfile } from '../services/authStorage';
import { COLORS, RADII } from '../theme/colors';

const { CallTracker } = NativeModules;
const CACHED_STATS_KEY = 'heeyaku_cached_stats';

interface ProfileScreenProps {
  permissionGranted: boolean;
  isListening: boolean;
  statusMessage: string;
  onRequestPermissions: () => void;
  onRefreshListener: () => void;
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  permissionGranted,
  isListening,
  onRequestPermissions,
  onLogout,
}) => {
  const isFullyActive = permissionGranted && isListening;
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [stats, setStats] = useState<{ totalAssigned: number; contactedToday: number; convertedTotal: number }>({
    totalAssigned: 0,
    contactedToday: 0,
    convertedTotal: 0,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isFetchingRef = useRef(false);

  // 1. Instant Cache Hydration on Mount
  useEffect(() => {
    async function loadCachedProfileAndStats() {
      try {
        const cached = await authStorage.getSession();
        if (cached?.employee) {
          setProfile(cached.employee);
        }
        if (CallTracker?.getItem) {
          const cachedStatsRaw = await CallTracker.getItem(CACHED_STATS_KEY);
          if (cachedStatsRaw) {
            const parsed = JSON.parse(cachedStatsRaw);
            if (parsed && typeof parsed === 'object') {
              setStats(parsed);
            }
          }
        }
      } catch (e) {
        console.log('Error reading cached profile/stats:', e);
      }
    }
    loadCachedProfileAndStats();
  }, []);

  const loadBackendProfile = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isRefresh) setRefreshing(true);

    try {
      const res = await apiClient.getMe();
      if (res.success && res.employee) {
        setProfile(res.employee);
        if (res.stats) {
          setStats(res.stats);
          if (CallTracker?.setItem) {
            CallTracker.setItem(CACHED_STATS_KEY, JSON.stringify(res.stats)).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load fresh employee profile:', e);
    } finally {
      if (isRefresh) setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadBackendProfile(false);
    const interval = setInterval(() => {
      loadBackendProfile(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadBackendProfile]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadBackendProfile(true)}
          tintColor="#38BDF8"
        />
      }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>BDA Profile</Text>
      </View>

      {/* Employee Identity Card */}
      <Card variant="default" style={styles.card}>
        <View style={styles.profileRow}>
          <Avatar name={profile?.name || 'BDA Associate'} size={54} />
          <View style={styles.profileDetails}>
            <Text style={styles.employeeName}>{profile?.name || 'BDA Associate'}</Text>
            <View style={styles.roleBadgeContainer}>
              <Text style={styles.employeeRole}>
                Business Development Associate (BDA)
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* LIVE CRM OUTPUT & METRICS */}
      <Text style={styles.sectionTitle}>TODAY'S SUMMARY</Text>
      <Card variant="default" style={styles.card}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalAssigned}</Text>
            <Text style={styles.statLabel}>Assigned Leads</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.contactedToday}</Text>
            <Text style={styles.statLabel}>Contacted Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#22C55E' }]}>{stats.convertedTotal}</Text>
            <Text style={styles.statLabel}>Converted</Text>
          </View>
        </View>
      </Card>

      {/* ACCOUNT DETAILS */}
      <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
      <Card variant="default" style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee Code</Text>
          <Text style={styles.infoValueMono}>{profile?.employeeCode || 'EMP-XXXX'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Login Email</Text>
          <Text style={styles.infoValue}>{profile?.email || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Official Role</Text>
          <Text style={styles.infoValue}>Business Development Associate (BDA)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Assigned Team</Text>
          <Text style={styles.infoValue}>{profile?.team || 'General'}</Text>
        </View>
        <View style={styles.infoRowLast}>
          <Text style={styles.infoLabel}>Contact Number</Text>
          <Text style={styles.infoValue}>{profile?.phoneNumber || '-'}</Text>
        </View>
      </Card>

      {/* PHONE & TRACKING */}
      <Text style={styles.sectionTitle}>PHONE & TRACKING</Text>
      <Card variant="default" style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Call Tracker</Text>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isFullyActive ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text style={styles.statusText}>
              {isFullyActive ? 'Active & Listening' : 'Permission Required'}
            </Text>
          </View>
        </View>

        {!isFullyActive && (
          <View style={styles.permissionActionBox}>
            <Text style={styles.permissionPromptText}>
              Call tracking needs telephony permission to log calls automatically.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onRequestPermissions}
              style={styles.allowButton}>
              <Text style={styles.allowButtonText}>Grant Telephony Access</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogout}
        style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Sign Out Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Title & Description */}
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to sign out? You will need your credentials to log back in.
            </Text>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowLogoutModal(false)}
                style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  setShowLogoutModal(false);
                  await authStorage.clearSession();
                  if (onLogout) onLogout();
                }}
                style={styles.modalSignOutBtn}>
                <Text style={styles.modalSignOutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subtle Brand Footer */}
      <View style={styles.footerBranding}>
        <HeeyakuLogo size={22} />
        <Text style={styles.footerText}>HEEYAKU Call Tracker & CRM • v1.2</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121316',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#1C1D22',
    borderColor: '#272932',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roleBadgeContainer: {
    marginTop: 2,
  },
  employeeRole: {
    fontSize: 12,
    color: COLORS.brandCyan,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8D919C',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#8D919C',
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#272932',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#272932',
  },
  infoRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 11,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8D919C',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoValueMono: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: COLORS.brandCyan,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121316',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionActionBox: {
    marginTop: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  permissionPromptText: {
    fontSize: 11,
    color: '#F59E0B',
    lineHeight: 16,
    marginBottom: 8,
  },
  allowButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  footerBranding: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 6,
  },

  /* Fancy Themed Sign Out Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#18191E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262932',
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#26191E',
    borderWidth: 1,
    borderColor: '#3F1F27',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconText: {
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EDEDED',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13,
    color: '#8B8F9A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#22242B',
    borderWidth: 1,
    borderColor: '#2D3039',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4D6DC',
  },
  modalSignOutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSignOutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
