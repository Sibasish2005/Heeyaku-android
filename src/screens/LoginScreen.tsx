import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HeeyakuLogo } from '../components/common/HeeyakuLogo';
import { apiClient } from '../services/apiClient';
import { authStorage, EmployeeProfile } from '../services/authStorage';

interface LoginScreenProps {
  onLoginSuccess: (employee: EmployeeProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isIdentifierFocused, setIsIdentifierFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // First-time device OTP state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  const scrollRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const otpInputRef = useRef<any>(null);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Ensure inputs stay visible when keyboard opens on small screens
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (isPasswordFocused || isOtpFocused) {
        scrollRef.current?.scrollTo({ y: 120, animated: true });
      }
    });
    return () => {
      showSub.remove();
    };
  }, [isPasswordFocused, isOtpFocused]);

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
    setInfoMessage(null);
    setLoading(true);

    try {
      const deviceId = await authStorage.getDeviceId();
      const res = await apiClient.login(
        identifier.trim(),
        password.trim(),
        deviceId,
        'Android Device'
      );

      // Check if first-time device OTP challenge is required
      if (res.requiresOtp && res.tempToken) {
        setTempToken(res.tempToken);
        setMaskedEmail(res.maskedEmail || 'your email');
        setIsOtpStep(true);
        setOtpCode('');
        setResendCooldown(60);
        setInfoMessage(
          `First-time login detected on this device. A 6-digit verification code has been sent to ${res.maskedEmail || 'your email'}.`
        );
        setTimeout(() => otpInputRef.current?.focus(), 300);
        return;
      }

      if (!res.success || !res.token) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      if (res.employee?.role && res.employee.role !== 'BDA') {
        setErrorMessage(
          'Mobile app access is restricted to Business Development Associates (BDA).'
        );
        return;
      }

      await authStorage.saveSession({
        token: res.token,
        employee: res.employee,
      });

      onLoginSuccess(res.employee);
    } catch {
      setErrorMessage('Unable to connect. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    const cleanCode = otpCode.trim().replace(/\s+/g, '');

    if (!cleanCode || cleanCode.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!tempToken) {
      setIsOtpStep(false);
      setErrorMessage('Verification session expired. Please sign in again.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const deviceId = await authStorage.getDeviceId();
      const res = await apiClient.verifyDeviceOtp(
        tempToken,
        cleanCode,
        deviceId,
        'Android Device'
      );

      if (!res.success || !res.token) {
        if (res.sessionExpired) {
          setIsOtpStep(false);
        }
        setErrorMessage(res.error || 'Verification failed. Please check your code and try again.');
        return;
      }

      if (res.employee?.role && res.employee.role !== 'BDA') {
        setErrorMessage('Mobile app access is restricted to Business Development Associates (BDA).');
        return;
      }

      await authStorage.saveSession({
        token: res.token,
        employee: res.employee,
      });

      onLoginSuccess(res.employee);
    } catch {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending || !tempToken) return;

    setResending(true);
    setErrorMessage(null);
    try {
      const deviceId = await authStorage.getDeviceId();
      const res = await apiClient.resendDeviceOtp(tempToken, deviceId);

      if (res.success && res.tempToken) {
        setTempToken(res.tempToken);
        setResendCooldown(60);
        setInfoMessage(`A fresh 6-digit verification code has been sent to ${res.maskedEmail || maskedEmail}.`);
      } else {
        setErrorMessage(res.error || 'Unable to resend code. Please try again.');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    setIsOtpStep(false);
    setOtpCode('');
    setErrorMessage(null);
    setInfoMessage(null);
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
          <Text style={styles.brandSubtitle}>Sales Associate Portal • BDA Only</Text>
        </View>

        {/* Clean, Normal Login / OTP Card */}
        <View style={styles.card}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {infoMessage && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          {!isOtpStep ? (
            /* STEP 1: CREDENTIALS INPUT */
            <>
              {/* Employee ID or Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email or Employee ID</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    setErrorMessage(null);
                  }}
                  onFocus={() => setIsIdentifierFocused(true)}
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
            </>
          ) : (
            /* STEP 2: DEVICE VERIFICATION */
            <View style={styles.otpSection}>
              <View style={styles.otpHeader}>
                <View style={styles.otpBadge}>
                  <Text style={styles.otpBadgeText}>🔐 DEVICE VERIFICATION</Text>
                </View>
                <Text style={styles.otpTitle}>Verify Your Device</Text>
                <Text style={styles.otpSubtitle}>
                  A 6-digit verification code has been sent to:
                </Text>
                <View style={styles.emailChip}>
                  <Text style={styles.emailChipText}>{maskedEmail}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
                <TextInput
                  ref={otpInputRef}
                  value={otpCode}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(clean);
                    setErrorMessage(null);
                  }}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                  placeholder="• • • • • •"
                  placeholderTextColor="#475569"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                  style={[
                    styles.input,
                    styles.otpInput,
                    isOtpFocused && styles.inputFocused,
                  ]}
                />
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length < 6}
                style={[
                  styles.submitButton,
                  (loading || otpCode.length < 6) && styles.submitButtonDisabled,
                ]}>
                {loading ? (
                  <ActivityIndicator color="#090A0E" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Verify & Register Device</Text>
                )}
              </TouchableOpacity>

              {/* Resend and Back Buttons */}
              <View style={styles.otpFooter}>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendCooldownText}>
                    Resend code in {resendCooldown}s
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={resending}
                    activeOpacity={0.7}>
                    <Text style={styles.resendLinkText}>
                      {resending ? 'Sending...' : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleBackToLogin}
                  activeOpacity={0.7}
                  style={styles.backButton}>
                  <Text style={styles.backButtonText}>← Sign in with another account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Security & Access Restriction Notice */}
          <View style={styles.securityNotice}>
            <Text style={styles.securityNoticeText}>🔒 Secure Portal • BDA Access Only</Text>
            <Text style={styles.securitySubtext}>
              Accounts are managed by your administrator.
            </Text>
          </View>
        </View>

      </ScrollView>
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
  infoContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#60A5FA',
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
  otpSection: {
    paddingVertical: 4,
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  otpBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 0.8,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  otpSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailChip: {
    backgroundColor: '#1E222D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2F3445',
  },
  emailChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 10,
    fontWeight: '700',
  },
  otpFooter: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendCooldownText: {
    fontSize: 12,
    color: '#64748B',
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  securityNotice: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  securityNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  securitySubtext: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
});
