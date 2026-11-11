import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../theme/colors';

// ─── Ice-cream SVG-style emblem drawn purely in RN ───────────────────────────
function IceCreamEmblem() {
  return (
    <View style={emblemStyles.wrapper}>
      {/* Waffle cone */}
      <View style={emblemStyles.cone} />
      {/* Three scoops */}
      <View style={[emblemStyles.scoop, emblemStyles.scoopBottom]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopMiddle]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopTop]} />
      {/* Cherry */}
      <View style={emblemStyles.cherry} />
      {/* Drizzle lines */}
      <View style={emblemStyles.drizzle1} />
      <View style={emblemStyles.drizzle2} />
    </View>
  );
}

const emblemStyles = StyleSheet.create({
  wrapper: {
    width: 72,
    height: 90,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderTopWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.chocolateBrown,
    marginTop: 'auto' as unknown as number,
  },
  scoop: {
    position: 'absolute',
    borderRadius: 50,
  },
  scoopBottom: {
    width: 46,
    height: 46,
    backgroundColor: COLORS.strawberryPink,
    bottom: 32,
  },
  scoopMiddle: {
    width: 42,
    height: 42,
    backgroundColor: '#F9C6D0',
    bottom: 54,
  },
  scoopTop: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.vanillaCream,
    bottom: 72,
    borderWidth: 2,
    borderColor: COLORS.vanillaCreamDark,
  },
  cherry: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
    bottom: 102,
  },
  drizzle1: {
    position: 'absolute',
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateBrown,
    bottom: 68,
    left: 10,
    transform: [{ rotate: '-20deg' }],
  },
  drizzle2: {
    position: 'absolute',
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateBrown,
    bottom: 60,
    right: 12,
    transform: [{ rotate: '15deg' }],
  },
});
// ─────────────────────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onGoToSignUp: () => void;
}

export default function LoginScreen({ onLoginSuccess, onGoToSignUp }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  // Button press scale animation
  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(btnScale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    // TODO: wire to backend auth endpoint
    await new Promise<void>((r) => setTimeout(r, 1200));
    setLoading(false);
    onLoginSuccess();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top brand section ── */}
          <View style={styles.brandSection}>
            <View style={styles.emblemBubble}>
              <IceCreamEmblem />
            </View>
            <Text style={styles.brandName}>Best Cream</Text>
            <Text style={styles.brandTagline}>Ice Cream & Pancakes</Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>
            <Text style={styles.heading}>Welcome Back 👋</Text>
            <Text style={styles.subheading}>Log in to your account to continue</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setEmailError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, passwordError ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotWrap} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleLogin}
                onPressIn={() => animatePress(0.96)}
                onPressOut={() => animatePress(1)}
                activeOpacity={1}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.primaryBtnText}>Logging in…</Text>
                ) : (
                  <Text style={styles.primaryBtnText}>Log In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign up link */}
            <View style={styles.signUpRow}>
              <Text style={styles.signUpPrompt}>Don't have an account? </Text>
              <TouchableOpacity onPress={onGoToSignUp} activeOpacity={0.7}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Payment badges ── */}
          <View style={styles.paymentRow}>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentEmoji}>📱</Text>
              <Text style={styles.paymentLabel}>MTN MoMo</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentEmoji}>🟠</Text>
              <Text style={styles.paymentLabel}>Orange Money</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const CARD_RADIUS = 28;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.vanillaCream,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // ── Brand section ──
  brandSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emblemBubble: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: COLORS.strawberryPinkLight,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // ── Card ──
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 24,
    paddingVertical: 30,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.chocolateBrownLight,
    marginBottom: 24,
    lineHeight: 18,
  },

  // ── Form ──
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.vanillaCream,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.vanillaCreamDark,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  inputError: {
    borderColor: '#E53935',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.chocolateBrown,
    fontWeight: '500',
  },
  eyeIcon: {
    fontSize: 18,
    paddingLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '600',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 22,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.strawberryPink,
  },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: COLORS.strawberryPink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.5,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.vanillaCreamDark,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.chocolateBrownMuted,
  },

  // ── Sign up row ──
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpPrompt: {
    fontSize: 14,
    color: COLORS.chocolateBrownLight,
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.strawberryPink,
  },

  // ── Payment badges ──
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  paymentEmoji: {
    fontSize: 22,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chocolateBrownLight,
  },
  paymentDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.vanillaCreamDark,
    marginHorizontal: 16,
  },
});
