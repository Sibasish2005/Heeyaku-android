import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADII, SPACING } from '../theme/colors';
import { HeeyakuLogo } from '../components/common/HeeyakuLogo';
import { apiClient } from '../services/apiClient';
import { authStorage, EmployeeProfile } from '../services/authStorage';
import { API_BASE_URL, BACKEND_PRESETS, saveApiBaseUrl } from '../config/api';

interface LoginScreenProps {
  onLoginSuccess: (employee: EmployeeProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isIdentifierFocused, setIsIdentifierFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const passwordInputRef = useRef<any>(null);

  // Server URL Configuration state
  const [currentServer, setCurrentServer] = useState<string>(API_BASE_URL);
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverTestResult, setServerTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setCurrentServer(API_BASE_URL);
  }, []);

  const testServerConnection = async (targetUrl: string) => {
    setIsTestingServer(true);
    setServerTestResult(null);
    const cleanUrl = targetUrl.trim().replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${cleanUrl}/api/employee/auth/login`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // If we got a response back (200, 400, 405), the server is alive and reachable!
      if (res.status === 200 || res.status === 405 || res.status === 400) {
        setServerTestResult({
          success: true,
          message: 'Connected successfully! Server is online and responding.',
        });
      } else {
        setServerTestResult({
          success: false,
          message: `Server reachable but returned HTTP ${res.status}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setServerTestResult({
        success: false,
        message: `Cannot reach ${cleanUrl}: ${msg}`,
      });
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleApplyServer = async (newUrl: string) => {
    const clean = newUrl.trim().replace(/\/+$/, '');
    if (!clean) return;
    await saveApiBaseUrl(clean);
    setCurrentServer(clean);
    setShowServerModal(false);
    setServerTestResult(null);
    setErrorMessage(null);
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter your Employee ID or Email and password.');
      return;
    }

    if (password.trim().length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await apiClient.login(identifier.trim(), password.trim());
      if (!res.success || !res.token) {
        setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      // Enforce BDA-only role access
      if (res.employee?.role && res.employee.role !== 'BDA') {
        setErrorMessage(
          'Mobile app access is restricted to Business Development Associates (BDA). For administrative or team lead access, please log in via the Web Portal.'
        );
        return;
      }

      await authStorage.saveSession({
        token: res.token,
        employee: res.employee,
      });

      onLoginSuccess(res.employee);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not connect to HEEYAKU server.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        {/* Brand Header Lockup aligned with Web */}
        <View style={styles.brandHeader}>
          <HeeyakuLogo
            size={48}
            withText={true}
            withTagline={true}
            direction="column"
            textColor="#FFFFFF"
            taglineColor="#94A3B8"
          />
          <View style={styles.workspaceBadge}>
            <View style={styles.workspaceDot} />
            <Text style={styles.workspaceBadgeText}>BDA Telephony Workspace</Text>
          </View>
        </View>

        {/* Main Auth Card */}
        <View style={styles.card}>
          <View style={styles.titleSection}>
            <Text style={styles.loginTitle}>BDA Sign In</Text>
            <Text style={styles.loginDescription}>
              Enter your BDA credentials to access your assigned leads and tele-calling dashboard.
            </Text>
          </View>

          {/* BDA Focus Role Badge */}
          <View style={styles.rolesRow}>
            <View style={styles.roleChip}>
              <View style={styles.bdaDot} />
              <Text style={styles.roleChipText}>BUSINESS DEVELOPMENT ASSOCIATE (BDA)</Text>
            </View>
          </View>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconDot} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Inputs Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Employee Code or Email</Text>
              <TextInput
                value={identifier}
                onChangeText={(val) => {
                  setIdentifier(val);
                  setErrorMessage(null);
                }}
                onFocus={() => setIsIdentifierFocused(true)}
                onBlur={() => setIsIdentifierFocused(false)}
                placeholder="e.g. EMP-1001 or bda@heeyaku.com"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                autoComplete="username"
                textContentType="username"
                style={[
                  styles.input,
                  isIdentifierFocused && styles.inputFocused,
                ]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage(null);
                  }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  autoComplete="current-password"
                  textContentType="password"
                  style={[
                    styles.input,
                    styles.passwordInput,
                    isPasswordFocused && styles.inputFocused,
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}>
            {loading ? (
              <ActivityIndicator color={COLORS.monoWhite} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In to BDA Workspace</Text>
            )}
          </TouchableOpacity>

          {/* Server Connection Indicator */}
          <View style={styles.serverSection}>
            <View style={styles.serverRow}>
              <View style={styles.serverDot} />
              <Text style={styles.serverLabel} numberOfLines={1}>
                Server:{' '}
                <Text style={styles.serverValue}>
                  {currentServer.replace(/^https?:\/\//, '')}
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCustomServerInput(currentServer);
                  setServerTestResult(null);
                  setShowServerModal(true);
                }}
                style={styles.serverChangeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.serverChangeText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Security & RBAC Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            HEEYAKU BDA Telephony • Encrypted Mobile Session
          </Text>
        </View>

      </ScrollView>

      {/* Server Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Backend Server Connection</Text>
            <Text style={styles.modalSubtitle}>
              Select the server endpoint for BDA telephony and CRM synchronization.
            </Text>

            {/* Presets */}
            <View style={styles.presetContainer}>
              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  customServerInput === BACKEND_PRESETS.PRODUCTION && styles.presetBtnActive,
                ]}
                onPress={() => {
                  setCustomServerInput(BACKEND_PRESETS.PRODUCTION);
                  testServerConnection(BACKEND_PRESETS.PRODUCTION);
                }}>
                <View style={styles.presetHeader}>
                  <Text style={styles.presetName}>Cloud Production</Text>
                  <View style={styles.badgeCloud}>
                    <Text style={styles.badgeCloudText}>Live SSL</Text>
                  </View>
                </View>
                <Text style={styles.presetUrl}>{BACKEND_PRESETS.PRODUCTION}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetBtn,
                  customServerInput === BACKEND_PRESETS.ADB_DEVICE && styles.presetBtnActive,
                ]}
                onPress={() => {
                  setCustomServerInput(BACKEND_PRESETS.ADB_DEVICE);
                  testServerConnection(BACKEND_PRESETS.ADB_DEVICE);
                }}>
                <View style={styles.presetHeader}>
                  <Text style={styles.presetName}>Local USB / ADB Bridge</Text>
                  <View style={styles.badgeDev}>
                    <Text style={styles.badgeDevText}>Dev</Text>
                  </View>
                </View>
                <Text style={styles.presetUrl}>{BACKEND_PRESETS.ADB_DEVICE}</Text>
              </TouchableOpacity>
            </View>

            {/* Custom URL Input */}
            <View style={styles.customSection}>
              <Text style={styles.customLabel}>Server URL (or Local IP)</Text>
              <TextInput
                value={customServerInput}
                onChangeText={setCustomServerInput}
                placeholder="https://heeyaku.vercel.app or http://192.168.1.X:3000"
                placeholderTextColor="#64748B"
                style={styles.customInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              disabled={isTestingServer}
              onPress={() => testServerConnection(customServerInput)}>
              {isTestingServer ? (
                <ActivityIndicator size="small" color="#38BDF8" />
              ) : (
                <Text style={styles.testBtnText}>⚡ Test Connection</Text>
              )}
            </TouchableOpacity>

            {/* Test Result Feedback */}
            {serverTestResult && (
              <View
                style={[
                  styles.testResultBanner,
                  serverTestResult.success ? styles.testSuccessBanner : styles.testErrorBanner,
                ]}>
                <Text
                  style={[
                    styles.testResultText,
                    serverTestResult.success ? styles.testSuccessText : styles.testErrorText,
                  ]}>
                  {serverTestResult.message}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowServerModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => handleApplyServer(customServerInput)}>
                <Text style={styles.modalSaveText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0E',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  workspaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
    borderRadius: RADII.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 14,
    gap: 6,
  },
  workspaceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  workspaceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#12141A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#232632',
    padding: SPACING.xxl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  titleSection: {
    marginBottom: SPACING.md,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  loginDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 4,
  },
  rolesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: RADII.xs,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 6,
  },
  bdaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#38BDF8',
  },
  roleChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    gap: 8,
  },
  errorIconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formSection: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#262A38',
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 13,
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#181C26',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 64,
  },
  passwordToggle: {
    position: 'absolute',
    right: SPACING.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  serverSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E2330',
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  serverLabel: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
  },
  serverValue: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  serverChangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  serverChangeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#11131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262A38',
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 16,
  },
  presetContainer: {
    gap: 10,
    marginBottom: 16,
  },
  presetBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#181C26',
    borderWidth: 1,
    borderColor: '#262A38',
  },
  presetBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  badgeCloud: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCloudText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeDev: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDevText: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: '700',
  },
  presetUrl: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
  },
  customSection: {
    marginBottom: 12,
  },
  customLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  customInput: {
    backgroundColor: '#181C26',
    borderWidth: 1,
    borderColor: '#262A38',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
  },
  testBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 12,
  },
  testBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  testResultBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  testSuccessBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  testResultText: {
    fontSize: 11,
    lineHeight: 15,
  },
  testSuccessText: {
    color: '#34D399',
    fontWeight: '600',
  },
  testErrorText: {
    color: '#F87171',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#181C26',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
