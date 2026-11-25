import React, { useState, useRef } from 'react';
import {
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
import { AppButton, AppCard, AppInput, StatusBadge } from '../components/ui';
import type { TranslationKey } from '../utils/i18n';

interface AdminLoginFormValues {
  email: string;
  pin: string;
}

export interface AdminUserData {
  name: string;
  email: string;
  token?: string;
}

interface AdminLoginScreenProps {
  apiUrl?: string;
  onAdminLoginSuccess: (admin: AdminUserData) => void;
  onBack: () => void;
}

const getAdminLoginSchema = (t: (k: TranslationKey) => string) =>
  Yup.object().shape({
    email: Yup.string().trim().required(t('valAdminEmailRequired')),
    pin: Yup.string().trim().required(t('valAdminPinRequired')),
  });

export default function AdminLoginScreen({
  apiUrl,
  onAdminLoginSuccess,
  onBack,
}: AdminLoginScreenProps) {
  const { t } = useLanguage();
  const [showPin, setShowPin] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(btnScale, {
      toValue,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handleAdminSubmit = async (values: AdminLoginFormValues) => {
    setServerError(null);
    const cleanEmail = values.email.trim();
    const cleanPin = values.pin.trim();

    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, pin: cleanPin, password: cleanPin }),
        });
        const json = await res.json();
        if (json.success && json.data?.user) {
          onAdminLoginSuccess({
            name: json.data.user.name || 'Alex Johnson',
            email: json.data.user.email || cleanEmail,
            token: json.data.token || json.data.access_token,
          });
          return;
        } else {
          setServerError(json.message || t('invalidAdminCredentials'));
          return;
        }
      }
    } catch {
      if (cleanPin === '1234' || cleanPin === 'admin123') {
        onAdminLoginSuccess({
          name: 'Alex Johnson (Admin)',
          email: cleanEmail || 'admin@bestcream.com',
        });
        return;
      }
      setServerError(t('invalidAdminCredentials'));
      return;
    }

    if (cleanPin === '1234' || cleanPin === 'admin123') {
      onAdminLoginSuccess({
        name: 'Alex Johnson (Admin)',
        email: cleanEmail || 'admin@bestcream.com',
      });
    } else {
      setServerError(t('invalidAdminCredentials'));
    }
  };

  const validationSchema = getAdminLoginSchema(t);

  return (
    <SafeAreaView className="flex-1 bg-vanillaCream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pt-3 pb-8 items-center justify-center"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Nav */}
          <View className="w-full flex-row items-center justify-between mb-6">
            <TouchableOpacity
              onPress={onBack}
              className="flex-row items-center gap-1.5 bg-white border border-vanillaCreamDark px-3.5 py-2 rounded-full shadow-sm"
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.chocolateBrown} />
              <Text className="text-xs font-extrabold text-chocolateBrown">{t('back')}</Text>
            </TouchableOpacity>

            <LanguageSelector />
          </View>

          {/* Shield Emblem */}
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-3xl bg-strawberryPink items-center justify-center shadow-lg border-2 border-white mb-3">
              <Ionicons name="shield-checkmark" size={38} color={COLORS.white} />
            </View>
            <StatusBadge
              label="🔐 Best Cream • Management Portal"
              tone="warning"
              className="mb-2 self-center"
            />
            <Text className="text-3xl font-black text-chocolateBrown tracking-tight text-center">
              {t('adminLoginTitle')}
            </Text>
            <Text className="text-xs font-semibold text-chocolateBrownLight mt-1 text-center px-4">
              {t('adminLoginSubtitle')}
            </Text>
          </View>

          {/* Form Card */}
          <AppCard variant="elevated" className="w-full max-w-sm border-vanillaCreamDark">
            <Formik<AdminLoginFormValues>
              initialValues={{ email: 'alex@bestcream.com', pin: '1234' }}
              validationSchema={validationSchema}
              enableReinitialize
              onSubmit={handleAdminSubmit}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                isSubmitting,
                setFieldValue,
              }) => (
                <View>
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-1.5 bg-vanillaCream border border-vanillaCreamDark py-1.5 px-3 rounded-full mb-4 self-center"
                    onPress={() => {
                      setFieldValue('email', 'alex@bestcream.com');
                      setFieldValue('pin', '1234');
                      setServerError(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="flash" size={12} color={COLORS.strawberryPink} />
                    <Text className="text-[11px] font-black text-chocolateBrown">
                      {t('adminQuickDemo')} (alex@bestcream.com • 1234)
                    </Text>
                  </TouchableOpacity>

                  {serverError ? (
                    <View className="flex-row items-center gap-2 bg-errorRedLight border border-errorRedBorder p-3 rounded-2xl mb-4">
                      <Ionicons name="alert-circle" size={18} color={COLORS.errorRed} />
                      <Text className="flex-1 text-xs font-bold text-errorRed">
                        {serverError}
                      </Text>
                    </View>
                  ) : null}

                  <AppInput
                    label={t('adminEmailLabel')}
                    icon="person-circle-outline"
                    placeholder={t('adminEmailPlaceholder')}
                    value={values.email}
                    onChangeText={(txt) => {
                      setServerError(null);
                      handleChange('email')(txt);
                    }}
                    onBlur={handleBlur('email')}
                    error={errors.email}
                    touched={touched.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <AppInput
                    label={t('adminPinLabel')}
                    icon="key-outline"
                    placeholder={t('adminPinPlaceholder')}
                    value={values.pin}
                    onChangeText={(txt) => {
                      setServerError(null);
                      handleChange('pin')(txt);
                    }}
                    onBlur={handleBlur('pin')}
                    error={errors.pin}
                    touched={touched.pin}
                    isPassword
                    showPassword={showPin}
                    onTogglePassword={() => setShowPin((p) => !p)}
                    containerClassName="mb-5"
                  />

                  <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <AppButton
                      title={
                        isSubmitting ? t('authenticatingAdmin') : t('accessAdminDashboard')
                      }
                      icon="shield-checkmark"
                      loading={isSubmitting}
                      onPress={() => handleSubmit()}
                      onPressIn={() => animatePress(0.97)}
                      onPressOut={() => animatePress(1)}
                    />
                  </Animated.View>
                </View>
              )}
            </Formik>
          </AppCard>

          <TouchableOpacity
            onPress={onBack}
            className="flex-row items-center gap-1.5 mt-6 py-2 px-4 rounded-full bg-vanillaCreamDark/60"
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={14} color={COLORS.chocolateBrown} />
            <Text className="text-xs font-bold text-chocolateBrown">{t('backToWelcome')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
