import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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

  const scrollRef = useRef<any>(null);
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

  // Ensure inputs stay visible when keyboard opens on small screens
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (isPasswordFocused) {
        scrollRef.current?.scrollTo({ y: 120, animated: true });
      }
    });
    return () => {
      showSub.remove();
    };
  }, [isPasswordFocused]);

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

      if (res.status === 200 || res.status === 405 || res.status === 400) {
        setServerTestResult({
          success: true,
          message: 'Connected successfully. Server is online.',
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
        message: `Cannot reach server: ${msg}`,
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
    Keyboard.dismiss();

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

      if (res.employee?.role && res.employee.role !== 'BDA') {
        setErrorMessage(
          'Mobile app access is restricted to Business Development Associates (BDA). Please log in via the Web Portal.'
        );
        return;
      }

      await authStorage.saveSession({
        token: res.token,
        employee: res.employee,
      });

      onLoginSuccess(res.employee);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not connect to server.';
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
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        {/* Minimal Clean Header */}
        <View style={styles.brandHeader}>
          <HeeyakuLogo size={40} />
          <Text style={styles.brandTitle}>HEEYAKU</Text>
          <Text style={styles.brandSubtitle}>Sign in to your employee account</Text>
        </View>

        {/* Clean, Normal Login Card */}
        <View style={styles.card}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Employee ID or Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employee ID or Email</Text>
            <TextInput
              value={identifier}
              onChangeText={(val) => {
                setIdentifier(val);
                setErrorMessage(null);
              }}
              onFocus={() => {
                setIsIdentifierFocused(true);
              }}
              onBlur={() => setIsIdentifierFocused(false)}
              placeholder="e.g. EMP-1001 or email@heeyaku.com"
              placeholderTextColor="#64748B"
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

          {/* Password Input */}
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
                onFocus={() => {
                  setIsPasswordFocused(true);
                  scrollRef.current?.scrollTo({ y: 120, animated: true });
                }}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
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
                style={styles.passwordToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clean Normal Sign In Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}>
            {loading ? (
              <ActivityIndicator color="#090A0E" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Minimal Understated Server Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.serverInfoText}>
            Server: {currentServer.replace(/^https?:\/\//, '')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setCustomServerInput(currentServer);
              setServerTestResult(null);
              setShowServerModal(true);
            }}
            style={styles.changeServerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.changeServerText}>Change</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Clean Server Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Server Connection</Text>
            <Text style={styles.modalSubtitle}>
              Configure the backend endpoint for mobile synchronization.
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
                <Text style={styles.presetName}>Cloud Production (Default)</Text>
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
                <Text style={styles.presetName}>Local USB / Dev Bridge</Text>
                <Text style={styles.presetUrl}>{BACKEND_PRESETS.ADB_DEVICE}</Text>
              </TouchableOpacity>
            </View>

            {/* Custom URL Input */}
            <View style={styles.customSection}>
              <Text style={styles.customLabel}>Custom Server URL</Text>
              <TextInput
                value={customServerInput}
                onChangeText={setCustomServerInput}
                placeholder="https://heeyaku.vercel.app"
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.testBtnText}>Test Connection</Text>
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
                <Text style={styles.modalSaveText}>Save</Text>
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
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#121419',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#23252E',
    padding: 20,
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#F87171',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#181A21',
    borderWidth: 1,
    borderColor: '#272A36',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#FFFFFF',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 56,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#090A0E',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 16,
  },
  serverInfoText: {
    fontSize: 12,
    color: '#64748B',
  },
  changeServerButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  changeServerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121419',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#23252E',
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 16,
  },
  presetContainer: {
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    backgroundColor: '#181A21',
    borderWidth: 1,
    borderColor: '#272A36',
    borderRadius: 10,
    padding: 12,
  },
  presetBtnActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#1F222C',
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  presetUrl: {
    fontSize: 11,
    color: '#64748B',
  },
  customSection: {
    marginBottom: 14,
  },
  customLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  customInput: {
    backgroundColor: '#181A21',
    borderWidth: 1,
    borderColor: '#272A36',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FFFFFF',
  },
  testBtn: {
    backgroundColor: '#20222B',
    borderWidth: 1,
    borderColor: '#2E303C',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  testResultBanner: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  testSuccessBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  testErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  testResultText: {
    fontSize: 11,
    lineHeight: 16,
  },
  testSuccessText: {
    color: '#4ADE80',
  },
  testErrorText: {
    color: '#F87171',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modalSaveBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#090A0E',
  },
});
