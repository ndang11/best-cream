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

// ─── Small Ice-cream Emblem for Sign-up ───────────────────────────────────────
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
    width: 52,
    height: 66,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderTopWidth: 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4854A',
  },
  scoop: {
    position: 'absolute',
    borderRadius: 50,
  },
  scoopBottom: {
    width: 34,
    height: 34,
    backgroundColor: COLORS.strawberryPink,
    bottom: 22,
  },
  scoopMiddle: {
    width: 30,
    height: 30,
    backgroundColor: '#F9C6D0',
    bottom: 38,
  },
  scoopTop: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.vanillaCream,
    bottom: 52,
    borderWidth: 2,
    borderColor: COLORS.vanillaCreamDark,
  },
  cherry: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E53935',
    bottom: 74,
  },
});

// ─── Dynamic Yup Validation Schema ───────────────────────────────────────────
const getSignUpSchema = (t: (k: TranslationKey) => string) =>
  Yup.object().shape({
    fullName: Yup.string()
      .trim()
      .min(2, t('valNameMin'))
      .required(t('valNameRequired')),
    email: Yup.string()
      .trim()
      .email(t('valEmailInvalid'))
      .required(t('valEmailRequired')),
    phone: Yup.string()
      .trim()
      .matches(
        /^\+?[0-9\s-]{8,16}$/,
        t('valPhoneInvalid')
      )
      .required(t('valPhoneRequired')),
    password: Yup.string()
      .min(6, t('valPasswordMin'))
      .required(t('valPasswordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('valPasswordsMatch'))
      .required(t('valConfirmRequired')),
  });

interface SignUpFormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface SignUpUserData {
  name: string;
  email: string;
}

interface SignUpScreenProps {
  onSignUpSuccess: (user: SignUpUserData) => void;
  onGoToLogin: () => void;
  apiUrl?: string;
}

export default function SignUpScreen({
  onSignUpSuccess,
  onGoToLogin,
  apiUrl,
}: SignUpScreenProps) {
  const { t, language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(btnScale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const getPasswordStrength = (
    pwd: string
  ): { label: string; color: string; pct: number } => {
    if (!pwd) return { label: '', color: 'transparent', pct: 0 };
    if (pwd.length < 6) return { label: t('strengthWeak'), color: '#E53935', pct: 0.25 };
    if (pwd.length < 10)
      return { label: t('strengthFair'), color: COLORS.butterYellow, pct: 0.55 };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { label: t('strengthStrong'), color: COLORS.pistachioGreen, pct: 1 };
    return { label: t('strengthGood'), color: COLORS.pistachioGreen, pct: 0.8 };
  };

  const handleSignUpSubmit = async (values: SignUpFormValues) => {
    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: values.email.trim(),
            password: values.password,
            full_name: values.fullName.trim(),
          }),
        });
        const json = await res.json();
        if (!json.success) {
          console.warn('Backend signup message:', json.error);
        }
      } else {
        await new Promise<void>((r) => setTimeout(r, 800));
      }
    } catch {
      console.log('Using demo sign-up due to offline server');
    } finally {
      onSignUpSuccess({
        name: values.fullName.trim(),
        email: values.email.trim(),
      });
    }
  };

  const validationSchema = getSignUpSchema(t);

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
          {/* ── Top Bar with Back & Language Selector ── */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onGoToLogin}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.chocolateBrown} />
              <Text style={styles.backBtnText}>{t('back')}</Text>
            </TouchableOpacity>

            <LanguageSelector />
          </View>

          {/* ── Hero Header ── */}
          <View style={styles.heroHeader}>
            <View style={styles.heroCircle}>
              <IceCreamEmblemSmall />
            </View>
            <Text style={styles.heroTitle}>{t('joinTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('joinSubtitle')}</Text>
          </View>

          {/* ── Offer Banner ── */}
          <View style={styles.offerBanner}>
            <View style={styles.offerBannerLeft}>
              <View style={styles.offerIconWrap}>
                <Text style={{ fontSize: 16 }}>🎉</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>
                  {t('offerBanner')}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Formik Form Card ── */}
          <View style={styles.formCard}>
            <Formik
              enableReinitialize
              initialValues={{
                fullName: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: '',
              }}
              validationSchema={validationSchema}
              onSubmit={handleSignUpSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                isSubmitting,
              }) => {
                const strength = getPasswordStrength(values.password);

                const isFieldValid = (field: keyof SignUpFormValues) =>
                  touched[field] && !errors[field] && values[field].length > 0;

                return (
                  <View>
                    {/* 1. Full Name */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>
                        {t('fullNameLabel')}
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.fullName && errors.fullName
                            ? styles.inputError
                            : isFieldValid('fullName')
                            ? styles.inputValid
                            : styles.inputDefault,
                        ]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color={
                            touched.fullName && errors.fullName
                              ? COLORS.errorRed
                              : isFieldValid('fullName')
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={styles.inputText}
                          placeholder={t('fullNamePlaceholder')}
                          placeholderTextColor={COLORS.chocolateBrownMuted}
                          value={values.fullName}
                          onChangeText={handleChange('fullName')}
                          onBlur={handleBlur('fullName')}
                          autoCapitalize="words"
                          autoCorrect={false}
                          returnKeyType="next"
                        />
                        {isFieldValid('fullName') && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.pistachioGreen}
                          />
                        )}
                      </View>
                      {touched.fullName && errors.fullName && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={styles.fieldErrorText}>
                            {errors.fullName}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 2. Email Address */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>
                        {t('emailLabel')}
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.email && errors.email
                            ? styles.inputError
                            : isFieldValid('email')
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
                              : isFieldValid('email')
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
                        {isFieldValid('email') && (
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
                          <Text style={styles.fieldErrorText}>
                            {errors.email}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 3. Phone Number */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>
                        {t('phoneLabel')}
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.phone && errors.phone
                            ? styles.inputError
                            : isFieldValid('phone')
                            ? styles.inputValid
                            : styles.inputDefault,
                        ]}
                      >
                        <Ionicons
                          name="call-outline"
                          size={18}
                          color={
                            touched.phone && errors.phone
                              ? COLORS.errorRed
                              : isFieldValid('phone')
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={styles.inputText}
                          placeholder={t('phonePlaceholder')}
                          placeholderTextColor={COLORS.chocolateBrownMuted}
                          value={values.phone}
                          onChangeText={handleChange('phone')}
                          onBlur={handleBlur('phone')}
                          keyboardType="phone-pad"
                          returnKeyType="next"
                        />
                        {isFieldValid('phone') && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.pistachioGreen}
                          />
                        )}
                      </View>
                      {touched.phone && errors.phone && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={styles.fieldErrorText}>
                            {errors.phone}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 4. Password with Strength Meter */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>
                        {t('passwordLabel')}
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.password && errors.password
                            ? styles.inputError
                            : isFieldValid('password')
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
                              : isFieldValid('password')
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={styles.inputText}
                          placeholder="Min. 6 characters"
                          placeholderTextColor={COLORS.chocolateBrownMuted}
                          value={values.password}
                          onChangeText={handleChange('password')}
                          onBlur={handleBlur('password')}
                          secureTextEntry={!showPassword}
                          returnKeyType="next"
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

                      {/* Live Password Strength Meter */}
                      {values.password.length > 0 && (
                        <View style={styles.strengthRow}>
                          <View style={styles.strengthTrack}>
                            <View
                              style={[
                                styles.strengthFill,
                                {
                                  width: `${strength.pct * 100}%` as unknown as number,
                                  backgroundColor: strength.color,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.strengthLabel,
                              { color: strength.color },
                            ]}
                          >
                            {strength.label}
                          </Text>
                        </View>
                      )}

                      {touched.password && errors.password && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={styles.fieldErrorText}>
                            {errors.password}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 5. Confirm Password */}
                    <View style={styles.fieldWrap}>
                      <Text style={styles.fieldLabel}>
                        {t('confirmPasswordLabel')}
                      </Text>
                      <View
                        style={[
                          styles.inputWrap,
                          touched.confirmPassword && errors.confirmPassword
                            ? styles.inputError
                            : isFieldValid('confirmPassword')
                            ? styles.inputValid
                            : styles.inputDefault,
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={18}
                          color={
                            touched.confirmPassword && errors.confirmPassword
                              ? COLORS.errorRed
                              : isFieldValid('confirmPassword')
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={{ marginRight: 10 }}
                        />
                        <TextInput
                          style={styles.inputText}
                          placeholder={t('confirmPasswordPlaceholder')}
                          placeholderTextColor={COLORS.chocolateBrownMuted}
                          value={values.confirmPassword}
                          onChangeText={handleChange('confirmPassword')}
                          onBlur={handleBlur('confirmPassword')}
                          secureTextEntry={!showConfirm}
                          returnKeyType="done"
                          onSubmitEditing={() => handleSubmit()}
                        />
                        <Pressable
                          onPress={() => setShowConfirm((prev) => !prev)}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color={COLORS.chocolateBrownMuted}
                          />
                        </Pressable>
                      </View>
                      {touched.confirmPassword && errors.confirmPassword && (
                        <View style={styles.fieldErrorRow}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={styles.fieldErrorText}>
                            {errors.confirmPassword}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Terms note */}
                    <Text style={styles.termsText}>
                      {t('termsPre')}{' '}
                      <Text style={styles.termsLink}>{t('termsOfService')}</Text>
                      {' '}{t('and')}{' '}
                      <Text style={styles.termsLink}>{t('privacyPolicy')}</Text>.
                    </Text>

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
                            <Text style={styles.submitBtnText}>
                              {t('creatingAccount')}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={17} color={COLORS.chocolateBrown} />
                            <Text style={styles.submitBtnText}>
                              {t('createAccountBtn')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                );
              }}
            </Formik>

            {/* Login Link */}
            <View style={styles.loginLinkRow}>
              <Text style={styles.loginPromptText}>
                {t('alreadyHaveAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
                <Text style={styles.loginLinkText}>
                  {t('logIn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
  },

  // ── Hero Header ──
  heroHeader: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  heroCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.strawberryPinkLight,
    marginBottom: 8,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chocolateBrownMuted,
    marginTop: 2,
  },

  // ── Offer Banner ──
  offerBanner: {
    backgroundColor: COLORS.butterYellowLight,
    borderWidth: 1.5,
    borderColor: COLORS.butterYellow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  offerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.butterYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },

  // ── Form Card ──
  formCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },

  // Input fields
  fieldWrap: {
    marginBottom: 13,
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

  // Password strength meter
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  strengthTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.pageBg,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '900',
    minWidth: 60,
    textAlign: 'right',
  },

  // Terms
  termsText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.chocolateBrownMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  termsLink: {
    fontSize: 11,
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

  // Login link
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginPromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
  },
  loginLinkText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.strawberryPink,
  },
});