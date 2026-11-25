import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { AppButton, AppCard, AppInput } from '../components/ui';
import type { TranslationKey } from '../utils/i18n';

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
  wrapper: { width: 52, height: 66, alignItems: 'center', justifyContent: 'flex-end' },
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
  scoop: { position: 'absolute', borderRadius: 50 },
  scoopBottom: { width: 34, height: 34, backgroundColor: COLORS.strawberryPink, bottom: 22 },
  scoopMiddle: { width: 30, height: 30, backgroundColor: '#F9C6D0', bottom: 38 },
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

const getSignUpSchema = (t: (k: TranslationKey) => string) =>
  Yup.object().shape({
    fullName: Yup.string().trim().min(2, t('valNameMin')).required(t('valNameRequired')),
    email: Yup.string().trim().email(t('valEmailInvalid')).required(t('valEmailRequired')),
    phone: Yup.string()
      .trim()
      .matches(/^\+?[0-9\s-]{8,16}$/, t('valPhoneInvalid'))
      .required(t('valPhoneRequired')),
    password: Yup.string().min(6, t('valPasswordMin')).required(t('valPasswordRequired')),
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
  token?: string;
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
  const { t } = useLanguage();
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
  ): { label: string; color: string; barClass: string; widthClass: string } => {
    if (!pwd) return { label: '', color: 'transparent', barClass: 'bg-transparent', widthClass: 'w-0' };
    if (pwd.length < 6)
      return { label: t('strengthWeak'), color: COLORS.errorRed, barClass: 'bg-errorRed', widthClass: 'w-1/4' };
    if (pwd.length < 10)
      return { label: t('strengthFair'), color: '#D97706', barClass: 'bg-butterYellow', widthClass: 'w-1/2' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd))
      return { label: t('strengthStrong'), color: COLORS.pistachioGreen, barClass: 'bg-pistachioGreen', widthClass: 'w-full' };
    return { label: t('strengthGood'), color: COLORS.pistachioGreen, barClass: 'bg-pistachioGreen', widthClass: 'w-4/5' };
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
    <SafeAreaView className="flex-1 bg-pageBg">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-3 pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Bar */}
          <View className="w-full flex-row items-center justify-between mb-1">
            <TouchableOpacity
              className="flex-row items-center gap-1 bg-white px-3.5 py-2 rounded-full border border-borderSubtle shadow-sm"
              onPress={onGoToLogin}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.chocolateBrown} />
              <Text className="text-xs font-black text-chocolateBrown">{t('back')}</Text>
            </TouchableOpacity>

            <LanguageSelector />
          </View>

          {/* Hero Header */}
          <View className="items-center mt-1.5 mb-3.5">
            <View className="w-20 h-20 rounded-full bg-white items-center justify-center border-4 border-strawberryPinkLight shadow-md mb-2">
              <IceCreamEmblemSmall />
            </View>
            <Text className="text-2xl font-black text-chocolateBrown tracking-tight">
              {t('joinTitle')}
            </Text>
            <Text className="text-xs font-semibold text-chocolateBrownMuted mt-0.5 text-center">
              {t('joinSubtitle')}
            </Text>
          </View>

          {/* Offer Banner */}
          <View className="bg-butterYellowLight border border-butterYellow rounded-2xl px-3.5 py-2.5 mb-3.5 flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-xl bg-butterYellow items-center justify-center">
              <Text className="text-base">🎉</Text>
            </View>
            <Text className="text-xs font-extrabold text-amber-900 flex-1 leading-4">
              {t('offerBanner')}
            </Text>
          </View>

          {/* Formik Form Card */}
          <AppCard variant="elevated" className="w-full">
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
                  Boolean(touched[field] && !errors[field] && values[field].length > 0);

                return (
                  <View>
                    <AppInput
                      label={t('fullNameLabel')}
                      icon="person-outline"
                      placeholder={t('fullNamePlaceholder')}
                      value={values.fullName}
                      onChangeText={handleChange('fullName')}
                      onBlur={handleBlur('fullName')}
                      error={errors.fullName}
                      touched={touched.fullName}
                      isValid={isFieldValid('fullName')}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                    />

                    <AppInput
                      label={t('emailLabel')}
                      icon="mail-outline"
                      placeholder={t('emailPlaceholder')}
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      error={errors.email}
                      touched={touched.email}
                      isValid={isFieldValid('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />

                    <AppInput
                      label={t('phoneLabel')}
                      icon="call-outline"
                      placeholder={t('phonePlaceholder')}
                      value={values.phone}
                      onChangeText={handleChange('phone')}
                      onBlur={handleBlur('phone')}
                      error={errors.phone}
                      touched={touched.phone}
                      isValid={isFieldValid('phone')}
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />

                    <AppInput
                      label={t('passwordLabel')}
                      icon="lock-closed-outline"
                      placeholder="Min. 6 characters"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      error={errors.password}
                      touched={touched.password}
                      isValid={isFieldValid('password')}
                      isPassword
                      showPassword={showPassword}
                      onTogglePassword={() => setShowPassword((prev) => !prev)}
                      returnKeyType="next"
                      containerClassName={values.password.length > 0 ? 'mb-1.5' : 'mb-3.5'}
                    />

                    {values.password.length > 0 ? (
                      <View className="flex-row items-center gap-2 mb-3.5 px-1">
                        <View className="flex-1 h-1.5 bg-borderSubtle rounded-full overflow-hidden">
                          <View className={`h-full rounded-full ${strength.barClass} ${strength.widthClass}`} />
                        </View>
                        <Text
                          className="text-[11px] font-extrabold"
                          style={{ color: strength.color }}
                        >
                          {strength.label}
                        </Text>
                      </View>
                    ) : null}

                    <AppInput
                      label={t('confirmPasswordLabel')}
                      icon="shield-checkmark-outline"
                      placeholder={t('confirmPasswordPlaceholder')}
                      value={values.confirmPassword}
                      onChangeText={handleChange('confirmPassword')}
                      onBlur={handleBlur('confirmPassword')}
                      error={errors.confirmPassword}
                      touched={touched.confirmPassword}
                      isValid={isFieldValid('confirmPassword')}
                      isPassword
                      showPassword={showConfirm}
                      onTogglePassword={() => setShowConfirm((prev) => !prev)}
                      returnKeyType="done"
                      onSubmitEditing={() => handleSubmit()}
                    />

                    <Text className="text-[11px] text-chocolateBrownMuted text-center leading-4 mb-4">
                      {t('termsPre')}{' '}
                      <Text className="font-extrabold text-chocolateBrown">{t('termsOfService')}</Text>{' '}
                      {t('and')}{' '}
                      <Text className="font-extrabold text-chocolateBrown">{t('privacyPolicy')}</Text>.
                    </Text>

                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <AppButton
                        title={isSubmitting ? t('creatingAccount') : t('createAccountBtn')}
                        icon="sparkles"
                        loading={isSubmitting}
                        onPress={() => handleSubmit()}
                        onPressIn={() => animatePress(0.97)}
                        onPressOut={() => animatePress(1)}
                      />
                    </Animated.View>
                  </View>
                );
              }}
            </Formik>

            <View className="flex-row items-center justify-center mt-5">
              <Text className="text-xs font-semibold text-chocolateBrownLight">
                {t('alreadyHaveAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
                <Text className="text-xs font-black text-strawberryPink">{t('logIn')}</Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
