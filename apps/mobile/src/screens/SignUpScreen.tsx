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

// ─── Re-usable ice-cream emblem (small version for sign-up) ──────────────────
function IceCreamEmblemSmall() {
  return (
    <View style={emblemStyles.wrapper}>
      <View style={emblemStyles.cone} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopBottom]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopMiddle]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopTop]} />
      <View style={emblemStyles.cherry} />
    </View>
  );
}

const emblemStyles = StyleSheet.create({
  wrapper: {
    width: 56,
    height: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderTopWidth: 34,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4854A',
  },
  scoop: {
    position: 'absolute',
    borderRadius: 50,
  },
  scoopBottom: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.strawberryPink,
    bottom: 26,
  },
  scoopMiddle: {
    width: 32,
    height: 32,
    backgroundColor: '#F9C6D0',
    bottom: 42,
  },
  scoopTop: {
    width: 26,
    height: 26,
    backgroundColor: COLORS.vanillaCream,
    bottom: 56,
    borderWidth: 1.5,
    borderColor: COLORS.vanillaCreamDark,
  },
  cherry: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    bottom: 78,
  },
});
// ─────────────────────────────────────────────────────────────────────────────

interface SignUpScreenProps {
  onSignUpSuccess: () => void;
  onGoToLogin: () => void;
}

export default function SignUpScreen({ onSignUpSuccess, onGoToLogin }: SignUpScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    // TODO: wire to backend auth endpoint
    await new Promise<void>((r) => setTimeout(r, 1200));
    setLoading(false);
    onSignUpSuccess();
  };

  // ── Password strength indicator ──────────────────────────────────────────
  const getStrength = (): { label: string; color: string; pct: number } => {
    if (!password) return { label: '', color: 'transparent', pct: 0 };
    if (password.length < 6) return { label: 'Weak', color: '#E53935', pct: 0.25 };
    if (password.length < 10) return { label: 'Fair', color: COLORS.butterYellow, pct: 0.55 };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password))
      return { label: 'Strong', color: COLORS.pistachioGreen, pct: 1 };
    return { label: 'Good', color: COLORS.pistachioGreen, pct: 0.8 };
  };
  const strength = getStrength();

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
          {/* ── Top brand bar ── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onGoToLogin}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.emblemBubble}>
              <IceCreamEmblemSmall />
            </View>
            <View style={{ width: 60 }} />
          </View>

          {/* ── Heading ── */}
          <View style={styles.headingSection}>
            <Text style={styles.heading}>Join Best Cream 🍦</Text>
            <Text style={styles.subheading}>Create your account and start ordering</Text>
          </View>

          {/* ── Special offer pill ── */}
          <View style={styles.offerPill}>
            <Text style={styles.offerPillText}>🎉 New members get 10% off their first order!</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>

            {/* Full Name */}
            <Field
              label="Full Name"
              icon="👤"
              placeholder="e.g. John Doe"
              value={fullName}
              onChangeText={(t) => { setFullName(t); clearError('fullName'); }}
              error={errors.fullName}
              returnKeyType="next"
            />

            {/* Email */}
            <Field
              label="Email Address"
              icon="✉️"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError('email'); }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Phone */}
            <Field
              label="Phone Number"
              icon="📞"
              placeholder="+237 6XX XXX XXX"
              value={phone}
              onChangeText={(t) => { setPhone(t); clearError('phone'); }}
              error={errors.phone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, errors.password ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearError('password'); }}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
              {/* Strength bar */}
              {password.length > 0 ? (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: `${strength.pct * 100}%` as unknown as number, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>✅</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                  <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Terms note */}
            <Text style={styles.termsText}>
              By creating an account you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' & '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

            {/* CTA Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleSignUp}
                onPressIn={() => animatePress(0.96)}
                onPressOut={() => animatePress(1)}
                activeOpacity={1}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.primaryBtnText}>Creating Account…</Text>
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account 🍦</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already have an account? </Text>
              <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Log In</Text>
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

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Reusable Field component ─────────────────────────────────────────────────
interface FieldProps {
  label: string;
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
}

function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  autoCapitalize = 'words',
  returnKeyType = 'next',
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.chocolateBrownMuted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
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
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },

  // ── Top bar ──
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.vanillaCreamDark,
    width: 60,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  emblemBubble: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2.5,
    borderColor: COLORS.strawberryPinkLight,
  },

  // ── Heading ──
  headingSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.3,
  },
  subheading: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.chocolateBrownLight,
    marginTop: 4,
  },

  // ── Offer pill ──
  offerPill: {
    backgroundColor: COLORS.butterYellow,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 18,
    shadowColor: COLORS.butterYellow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  offerPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
    textAlign: 'center',
  },

  // ── Card ──
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },

  // ── Form ──
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.chocolateBrown,
    marginBottom: 7,
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
    fontSize: 15,
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

  // ── Strength bar ──
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    gap: 8,
  },
  strengthBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: COLORS.vanillaCreamDark,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
  },

  // ── Terms ──
  termsText: {
    fontSize: 12,
    color: COLORS.chocolateBrownMuted,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.strawberryPink,
    fontWeight: '700',
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
    letterSpacing: 0.4,
  },

  // ── Login row ──
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  loginPrompt: {
    fontSize: 14,
    color: COLORS.chocolateBrownLight,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.strawberryPink,
  },

  // ── Payment badges ──
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
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
