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

  const scrollRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);

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

});
