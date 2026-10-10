import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter your Employee ID or Email and password.');
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
        </View>

        {/* Security & RBAC Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            HEEYAKU BDA Telephony • Encrypted Mobile Session
          </Text>
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
});
