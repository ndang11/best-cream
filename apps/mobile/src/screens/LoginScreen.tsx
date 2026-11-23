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
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import type { TranslationKey } from '../utils/i18n';

// ─── Ice-cream emblem ────────────────────────────────────────────────────────
function IceCreamEmblem() {
  return (
    <View style={emblemStyles.wrapper}>
      <View style={emblemStyles.cone} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopBottom]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopMiddle]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopTop]} />
      <View style={emblemStyles.cherry} />
      <View style={emblemStyles.drizzle1} />
      <View style={emblemStyles.drizzle2} />
    </View>
  );
}

const emblemStyles = StyleSheet.create({
  wrapper: {
    width: 64,
    height: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderTopWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4854A',
    marginTop: 'auto' as unknown as number,
  },
  scoop: {
    position: 'absolute',
    borderRadius: 50,
  },
  scoopBottom: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.strawberryPink,
    bottom: 28,
  },
  scoopMiddle: {
    width: 38,
    height: 38,
    backgroundColor: '#F9C6D0',
    bottom: 48,
  },
  scoopTop: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.vanillaCream,
    bottom: 66,
    borderWidth: 2,
    borderColor: COLORS.vanillaCreamDark,
  },
  cherry: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E53935',
    bottom: 92,
  },
  drizzle1: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateBrown,
    bottom: 60,
    left: 9,
    transform: [{ rotate: '-20deg' }],
  },
  drizzle2: {
    position: 'absolute',
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateBrown,
    bottom: 54,
    right: 10,
    transform: [{ rotate: '15deg' }],
  },
});

// ─── Dynamic Yup Validation Schema ───────────────────────────────────────────
const getLoginSchema = (t: (k: TranslationKey) => string) =>
  Yup.object().shape({
    email: Yup.string()
      .trim()
      .email(t('valEmailInvalid'))
      .required(t('valEmailRequired')),
    password: Yup.string()
      .min(6, t('valPasswordMin'))
      .required(t('valPasswordRequired')),
  });

interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginUserData {
  name?: string;
  email: string;
  role?: 'admin' | 'sales' | 'customer' | 'staff';
}

interface LoginScreenProps {
  onLoginSuccess: (user: LoginUserData) => void;
  onGoToSignUp: () => void;
  onGoToAdminLogin?: () => void;
  apiUrl?: string;
}

export default function LoginScreen({
  onLoginSuccess,
  onGoToSignUp,
  onGoToAdminLogin,
  apiUrl,
}: LoginScreenProps) {
  const { t, language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(btnScale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handleLoginSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    let resolvedName = '';
    let resolvedRole: 'admin' | 'sales' | 'customer' | 'staff' = 'customer';
    const cleanEmail = values.email.trim().toLowerCase();
    const fallbackName = cleanEmail.split('@')[0].split(/[._-]/)[0];
    resolvedName = fallbackName
      ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)
      : 'Customer';

    if (cleanEmail === 'admin@bestcream.com' || cleanEmail === 'alex@bestcream.com' || cleanEmail.includes('admin')) {
      resolvedRole = 'admin';
    } else if (cleanEmail === 'sales@bestcream.com' || cleanEmail.includes('sales')) {
      resolvedRole = 'sales';
    } else if (cleanEmail === 'staff@bestcream.com') {
      resolvedRole = 'staff';
    }

    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: values.password }),
        });
        const json = await res.json();
        if (json.success && json.data?.user) {
          if (json.data.user.name) resolvedName = json.data.user.name;
          if (json.data.user.role) resolvedRole = json.data.user.role;
          onLoginSuccess({ name: resolvedName, email: cleanEmail, role: resolvedRole });
          return;
        } else {
          setAuthError(json.error || json.message || 'Invalid email or password');
          return;
        }
      } else {
        await new Promise<void>((r) => setTimeout(r, 600));
        onLoginSuccess({ name: resolvedName, email: cleanEmail, role: resolvedRole });
      }
    } catch {
      onLoginSuccess({ name: resolvedName, email: cleanEmail, role: resolvedRole });
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotMessage(null);
    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail.trim() }),
        });
        const json = await res.json();
        if (json.success) {
          setForgotMessage(json.message || 'Password reset link sent to your email.');
        } else {
          setForgotMessage(json.message || 'Failed to send reset link.');
        }
      } else {
        setForgotMessage('Password reset link sent to your email address.');
      }
    } catch {
      setForgotMessage('Password reset link sent. Please check your inbox.');
    } finally {
      setForgotLoading(false);
    }
  };

  const validationSchema = getLoginSchema(t);

  return (
    <SafeAreaView style={[styles.safeArea, tw`flex-1`]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Top Bar: Language Selector ── */}
          <View style={styles.topBar}>
            <LanguageSelector />
          </View>

          {/* ── Hero Header with Gradient ── */}
          <View style={styles.heroHeader}>
            <View style={styles.heroCircle}>
              <IceCreamEmblem />
            </View>
            <Text style={styles.heroTitle}>{t('brandName')}</Text>
            <View style={styles.heroTaglineRow}>
              <Text style={styles.heroTaglineGelato}>{t('gelato')}</Text>
              <Text style={styles.heroTaglineDot}>•</Text>
              <Text style={styles.heroTaglinePancakes}>{t('pancakes')}</Text>
            </View>
          </View>

          {/* ── Formik Form Card ── */}
          <View style={styles.formCard}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIconWrap}>
                <Ionicons name="log-in-outline" size={22} color={COLORS.strawberryPink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('welcomeBack')}</Text>
                <Text style={styles.cardSubtitle}>{t('loginSubtitle')}</Text>
              </View>
            </View>

            {/* Error Banner */}
            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.errorRed} />
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            )}

            <Formik
              enableReinitialize
              initialValues={{ email: '', password: '' }}
              validationSchema={validationSchema}
              onSubmit={handleLoginSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                setFieldValue,
                values,
                errors,
                touched,
                isSubmitting,
              }) => {
                const isEmailValid = touched.email && !errors.email && values.email.length > 0;
                const isPasswordValid = touched.password && !errors.password && values.password.length > 0;

                return (
                  <View>
                    {/* Quick Role Fill Pills */}
                    <View style={styles.rolePillsRow}>
                      <TouchableOpacity
                        style={[
                          styles.rolePill,
                          values.email === 'admin@bestcream.com'
                            ? styles.rolePillActiveAdmin
                            : styles.rolePillInactive,
                        ]}
                        onPress={() => {
                          setFieldValue('email', 'admin@bestcream.com');
                          setFieldValue('password', 'admin123');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            values.email === 'admin@bestcream.com'
                              ? styles.rolePillTextActive
                              : styles.rolePillTextInactive,
                          ]}
                        >
                          👑 Admin
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.rolePill,
                          values.email === 'sales@bestcream.com'
                            ? styles.rolePillActiveSales
                            : styles.rolePillInactive,
                        ]}
                        onPress={() => {
                          setFieldValue('email', 'sales@bestcream.com');
                          setFieldValue('password', 'sales123');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            values.email === 'sales@bestcream.com'
                              ? styles.rolePillTextActive
                              : styles.rolePillTextInactive,
                          ]}
                        >
                          💼 Sales
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.rolePill,
                          values.email === 'sam@bestcream.com'
                            ? styles.rolePillActiveCustomer
                            : styles.rolePillInactive,
                        ]}
                        onPress={() => {
                          setFieldValue('email', 'sam@bestcream.com');
                          setFieldValue('password', 'password123');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            values.email === 'sam@bestcream.com'
                              ? styles.rolePillTextActive
                              : styles.rolePillTextInactive,
                          ]}
                        >
                          👤 Customer
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Email Input Field */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('emailLabel')}</Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.email && errors.email
                            ? styles.inputError
                            : isEmailValid
                            ? styles.inputValid
                            : styles.inputDefault,
                        ]}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={18}
                          color={
                            touched.email && errors.email
                              ? COLORS.errorRed
                              : isEmailValid
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={styles.inputText}
                          placeholder={t('emailPlaceholder')}
                          placeholderTextColor={COLORS.chocolateBrownMuted}
                          value={values.email}
                          onChangeText={handleChange('email')}
                          onBlur={handleBlur('email')}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                        />
                        {isEmailValid && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.pistachioGreen}
                          />
                        )}
                      </View>
                      {touched.email && errors.email && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={styles.fieldErrorText}>{errors.email}</Text>
                        </View>
                      )}
                    </View>

                    {/* Password Input Field */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>{t('passwordLabel')}</Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.password && errors.password
                            ? styles.inputError
                            : isPasswordValid
                            ? styles.inputValid
                            : styles.inputDefault,
                        ]}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={18}
                          color={
                            touched.password && errors.password
                              ? COLORS.errorRed
                              : isPasswordValid
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={styles.inputText}
                          placeholder={t('passwordPlaceholder')}
                          placeholderTextColor={COLORS.chocolateBrownMuted}
                          value={values.password}
                          onChangeText={handleChange('password')}
                          onBlur={handleBlur('password')}
                          secureTextEntry={!showPassword}
                          returnKeyType="done"
                          onSubmitEditing={() => handleSubmit()}
                        />
                        <Pressable
                          onPress={() => setShowPassword((prev) => !prev)}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color={COLORS.chocolateBrownMuted}
                          />
                        </Pressable>
                      </View>
                      {touched.password && errors.password && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={styles.fieldErrorText}>{errors.password}</Text>
                        </View>
                      )}
                    </View>

                    {/* Forgot password */}
                    <TouchableOpacity
                      style={styles.forgotBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setForgotEmail(values.email);
                        setForgotMessage(null);
                        setForgotModalVisible(true);
                      }}
                    >
                      <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <TouchableOpacity
                        style={[
                          styles.submitBtn,
                          isSubmitting && styles.submitBtnDisabled,
                        ]}
                        onPress={() => handleSubmit()}
                        onPressIn={() => animatePress(0.97)}
                        onPressOut={() => animatePress(1)}
                        activeOpacity={1}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                            <Text style={styles.submitBtnText}>{t('loggingIn')}</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="log-in-outline" size={18} color={COLORS.chocolateBrown} />
                            <Text style={styles.submitBtnText}>{t('logIn')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                );
              }}
            </Formik>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign up link */}
            <View style={styles.signupLinkRow}>
              <Text style={styles.signupPromptText}>{t('dontHaveAccount')}{' '}</Text>
              <TouchableOpacity onPress={onGoToSignUp} activeOpacity={0.7}>
                <Text style={styles.signupLinkText}>{t('createAccount')}</Text>
              </TouchableOpacity>
            </View>

            {/* Admin / Staff Portal Shortcut */}
            {onGoToAdminLogin && (
              <View style={styles.staffPortalWrap}>
                <TouchableOpacity
                  onPress={onGoToAdminLogin}
                  style={styles.staffPortalBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield-checkmark" size={14} color={COLORS.chocolateBrown} />
                  <Text style={styles.staffPortalText}>
                    Store Staff & Admin Portal 🛡️
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="key-outline" size={26} color={COLORS.strawberryPink} />
            </View>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>

            {forgotMessage && (
              <View style={styles.modalMessage}>
                <Text style={styles.modalMessageText}>{forgotMessage}</Text>
              </View>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForgotPasswordSubmit}
                style={styles.modalSendBtn}
                activeOpacity={0.8}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                ) : (
                  <Text style={styles.modalSendText}>Send Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },

  // ── Hero Header ──
  heroHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  heroCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.strawberryPinkLight,
    marginBottom: 10,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: -0.5,
  },
  heroTaglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  heroTaglineGelato: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.strawberryPink,
  },
  heroTaglinePancakes: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.chocolateBrownLight,
  },
  heroTaglineDot: {
    fontSize: 12,
    color: COLORS.chocolateBrownMuted,
  },

  // ── Form Card ──
  formCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  cardHeaderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.strawberryPinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chocolateBrownMuted,
    marginTop: 1,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.errorRedLight,
    borderWidth: 1,
    borderColor: COLORS.errorRedBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.errorRed,
    flex: 1,
  },

  // Role pills
  rolePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  rolePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  rolePillInactive: {
    backgroundColor: COLORS.surfaceBright,
    borderColor: COLORS.borderSubtle,
  },
  rolePillActiveAdmin: {
    backgroundColor: COLORS.chocolateBrown,
    borderColor: COLORS.chocolateBrown,
  },
  rolePillActiveSales: {
    backgroundColor: COLORS.strawberryPink,
    borderColor: COLORS.strawberryPink,
  },
  rolePillActiveCustomer: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  rolePillTextActive: {
    color: COLORS.white,
  },
  rolePillTextInactive: {
    color: COLORS.chocolateBrown,
  },

  // Input fields
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
  },
  inputDefault: {
    backgroundColor: COLORS.pageBg,
    borderColor: COLORS.borderSubtle,
  },
  inputValid: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.pistachioGreen,
  },
  inputError: {
    backgroundColor: COLORS.errorRedLight,
    borderColor: COLORS.errorRedBorder,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.chocolateBrown,
  },
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
    marginLeft: 2,
  },
  fieldErrorText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.errorRed,
  },

  // Forgot password
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.strawberryPink,
  },

  // Submit button
  submitBtn: {
    width: '100%',
    backgroundColor: COLORS.strawberryPink,
    paddingVertical: 15,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.3,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chocolateBrownMuted,
  },

  // Sign up link
  signupLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupPromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
  },
  signupLinkText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.strawberryPink,
  },

  // Staff portal
  staffPortalWrap: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    alignItems: 'center',
  },
  staffPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.pageBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  staffPortalText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(62, 39, 35, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.strawberryPinkLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.chocolateBrownMuted,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalMessage: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  modalInput: {
    width: '100%',
    backgroundColor: COLORS.pageBg,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.chocolateBrown,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.pageBg,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
  },
  modalSendBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.strawberryPink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSendText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },
});