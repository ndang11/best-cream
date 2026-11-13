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
    bottom: 24,
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
    borderWidth: 2,
    borderColor: COLORS.vanillaCreamDark,
  },
  cherry: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    bottom: 80,
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
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow px-6 pt-3 pb-8 items-center`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Bar with Back & Language Selector ── */}
          <View style={tw`w-full flex-row items-center justify-between mb-2`}>
            <TouchableOpacity
              style={tw`flex-row items-center gap-1 bg-white px-3.5 py-1.5 rounded-2xl border border-vanillaCreamDark shadow-sm`}
              onPress={onGoToLogin}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={14} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-black text-chocolateBrown`}>{t('back')}</Text>
            </TouchableOpacity>

            <LanguageSelector />
          </View>

          {/* ── Header with Logo ── */}
          <View style={tw`items-center mb-3 mt-1`}>
            <View style={tw`w-16 h-16 rounded-full bg-white items-center justify-center border-2 border-strawberryPinkLight shadow-md mb-2`}>
              <IceCreamEmblemSmall />
            </View>
            <Text style={tw`text-2xl font-black text-chocolateBrown tracking-wide`}>
              {t('joinTitle')}
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrownMuted mt-0.5`}>
              {t('joinSubtitle')}
            </Text>
          </View>

          {/* ── Offer Pill Banner ── */}
          <View style={tw`flex-row items-center gap-2 bg-butterYellowLight border border-butterYellow/60 rounded-2xl px-4 py-2 mb-4 shadow-sm`}>
            <Text style={tw`text-sm`}>🎉</Text>
            <Text style={tw`text-xs font-black text-amber-900`}>
              {t('offerBanner')}
            </Text>
          </View>

          {/* ── Formik Form Card ── */}
          <View style={tw`w-full bg-white rounded-3xl p-6 border border-vanillaCreamDark shadow-lg`}>
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
                    <View style={tw`mb-3`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('fullNameLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.fullName && errors.fullName
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isFieldValid('fullName')
                            ? tw`border-pistachioGreen bg-white`
                            : tw`border-vanillaCreamDark`,
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
                          style={tw`mr-2.5`}
                        />
                        <TextInput
                          style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
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
                        <View style={tw`flex-row items-center gap-1 mt-1 ml-1`}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={tw`text-xs text-errorRed font-semibold`}>
                            {errors.fullName}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 2. Email Address */}
                    <View style={tw`mb-3`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('emailLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.email && errors.email
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isFieldValid('email')
                            ? tw`border-pistachioGreen bg-white`
                            : tw`border-vanillaCreamDark`,
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
                          style={tw`mr-2.5`}
                        />
                        <TextInput
                          style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
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
                        <View style={tw`flex-row items-center gap-1 mt-1 ml-1`}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={tw`text-xs text-errorRed font-semibold`}>
                            {errors.email}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 3. Phone Number */}
                    <View style={tw`mb-3`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('phoneLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.phone && errors.phone
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isFieldValid('phone')
                            ? tw`border-pistachioGreen bg-white`
                            : tw`border-vanillaCreamDark`,
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
                          style={tw`mr-2.5`}
                        />
                        <TextInput
                          style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
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
                        <View style={tw`flex-row items-center gap-1 mt-1 ml-1`}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={tw`text-xs text-errorRed font-semibold`}>
                            {errors.phone}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 4. Password with Strength Meter */}
                    <View style={tw`mb-3`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('passwordLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.password && errors.password
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isFieldValid('password')
                            ? tw`border-pistachioGreen bg-white`
                            : tw`border-vanillaCreamDark`,
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
                          style={tw`mr-2.5`}
                        />
                        <TextInput
                          style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
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
                        <View style={tw`flex-row items-center mt-2 gap-2`}>
                          <View style={tw`flex-1 h-1.5 bg-vanillaCreamDark rounded-full overflow-hidden`}>
                            <View
                              style={[
                                tw`h-full rounded-full`,
                                {
                                  width: `${strength.pct * 100}%` as unknown as number,
                                  backgroundColor: strength.color,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              tw`text-[11px] font-black text-right`,
                              { color: strength.color },
                            ]}
                          >
                            {strength.label}
                          </Text>
                        </View>
                      )}

                      {touched.password && errors.password && (
                        <View style={tw`flex-row items-center gap-1 mt-1 ml-1`}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={tw`text-xs text-errorRed font-semibold`}>
                            {errors.password}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 5. Confirm Password */}
                    <View style={tw`mb-4`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('confirmPasswordLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.confirmPassword && errors.confirmPassword
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isFieldValid('confirmPassword')
                            ? tw`border-pistachioGreen bg-white`
                            : tw`border-vanillaCreamDark`,
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
                          style={tw`mr-2.5`}
                        />
                        <TextInput
                          style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
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
                        <View style={tw`flex-row items-center gap-1 mt-1 ml-1`}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={tw`text-xs text-errorRed font-semibold`}>
                            {errors.confirmPassword}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Terms note */}
                    <Text style={tw`text-[11px] text-chocolateBrownMuted text-center mb-4 leading-4`}>
                      {t('termsPre')}{' '}
                      <Text style={tw`text-strawberryPink font-bold`}>{t('termsOfService')}</Text>
                      {' '}{t('and')}{' '}
                      <Text style={tw`text-strawberryPink font-bold`}>{t('privacyPolicy')}</Text>.
                    </Text>

                    {/* Submit Button */}
                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <TouchableOpacity
                        style={[
                          tw`w-full bg-strawberryPink py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-md`,
                          isSubmitting && tw`opacity-70`,
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
                            <Text style={tw`text-sm font-black text-chocolateBrown tracking-wide`}>
                              {t('creatingAccount')}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={16} color={COLORS.chocolateBrown} />
                            <Text style={tw`text-sm font-black text-chocolateBrown tracking-wide`}>
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
            <View style={tw`flex-row justify-center items-center mt-5`}>
              <Text style={tw`text-xs font-semibold text-chocolateBrownLight`}>
                {t('alreadyHaveAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
                <Text style={tw`text-xs font-black text-strawberryPink`}>
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
