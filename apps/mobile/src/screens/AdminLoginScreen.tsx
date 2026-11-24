import React, { useState, useRef } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
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
      // Local verification fallback (PIN: 1234 or password: admin123)
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

    // Direct check if apiUrl was omitted
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
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow px-6 pt-3 pb-8 items-center justify-center`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Nav: Back Button & Language Selector */}
          <View style={tw`w-full flex-row items-center justify-between mb-5`}>
            <TouchableOpacity
              onPress={onBack}
              style={tw`flex-row items-center gap-1.5 bg-white border border-vanillaCreamDark px-3 py-1.5 rounded-full shadow-sm`}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.chocolateBrown} />
              <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('back')}</Text>
            </TouchableOpacity>

            <LanguageSelector />
          </View>

          {/* Shield Badge & Emblem */}
          <View style={tw`items-center mb-6`}>
            <View style={tw`w-20 h-20 rounded-3xl bg-strawberryPink items-center justify-center shadow-lg border-2 border-white mb-3`}>
              <Ionicons name="shield-checkmark" size={38} color={COLORS.white} />
            </View>
            <View style={tw`flex-row items-center gap-1.5 bg-butterYellowLight px-3 py-1 rounded-full border border-butterYellow mb-2`}>
              <Text style={tw`text-xs`}>🔐</Text>
              <Text style={tw`text-[11px] font-black text-chocolateBrown tracking-wider uppercase`}>
                Best Cream • Management Portal
              </Text>
            </View>
            <Text style={tw`text-3xl font-black text-chocolateBrown tracking-wide text-center`}>
              {t('adminLoginTitle')}
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrownLight mt-1 text-center px-4`}>
              {t('adminLoginSubtitle')}
            </Text>
          </View>

          {/* Form Card */}
          <View style={tw`w-full max-w-sm bg-white rounded-3xl p-6 border border-vanillaCreamDark shadow-lg`}>
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
                  {/* Quick Demo Fill Pill */}
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center gap-1.5 bg-vanillaCream border border-vanillaCreamDark py-1.5 px-3 rounded-full mb-4 self-center`}
                    onPress={() => {
                      setFieldValue('email', 'alex@bestcream.com');
                      setFieldValue('pin', '1234');
                      setServerError(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash" size={12} color={COLORS.strawberryPink} />
                    <Text style={tw`text-[11px] font-black text-chocolateBrown`}>
                      {t('adminQuickDemo')} (alex@bestcream.com • PIN: 1234)
                    </Text>
                  </TouchableOpacity>

                  {/* Server Error Alert */}
                  {serverError && (
                    <View style={tw`flex-row items-center gap-2 bg-red-50 border border-red-200 p-3 rounded-2xl mb-4`}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                      <Text style={tw`flex-1 text-xs font-bold text-red-600`}>{serverError}</Text>
                    </View>
                  )}

                  {/* Admin Email Input */}
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-extrabold text-chocolateBrown mb-1.5 tracking-wide`}>
                      {t('adminEmailLabel')}
                    </Text>
                    <View
                      style={[
                        tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                        touched.email && errors.email
                          ? tw`border-red-400 bg-red-50/50`
                          : tw`border-vanillaCreamDark`,
                      ]}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={19}
                        color={COLORS.chocolateBrownMuted}
                        style={tw`mr-2.5`}
                      />
                      <TextInput
                        style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
                        placeholder={t('adminEmailPlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                        value={values.email}
                        onChangeText={(txt) => {
                          setServerError(null);
                          handleChange('email')(txt);
                        }}
                        onBlur={handleBlur('email')}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                    {touched.email && errors.email && (
                      <Text style={tw`text-[11px] font-bold text-red-500 mt-1 ml-1`}>
                        {errors.email}
                      </Text>
                    )}
                  </View>

                  {/* Admin PIN / Password Input */}
                  <View style={tw`mb-5`}>
                    <Text style={tw`text-xs font-extrabold text-chocolateBrown mb-1.5 tracking-wide`}>
                      {t('adminPinLabel')}
                    </Text>
                    <View
                      style={[
                        tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                        touched.pin && errors.pin
                          ? tw`border-red-400 bg-red-50/50`
                          : tw`border-vanillaCreamDark`,
                      ]}
                    >
                      <Ionicons
                        name="key-outline"
                        size={19}
                        color={COLORS.chocolateBrownMuted}
                        style={tw`mr-2.5`}
                      />
                      <TextInput
                        style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
                        placeholder={t('adminPinPlaceholder')}
                        placeholderTextColor={COLORS.chocolateBrownMuted}
                        value={values.pin}
                        onChangeText={(txt) => {
                          setServerError(null);
                          handleChange('pin')(txt);
                        }}
                        onBlur={handleBlur('pin')}
                        secureTextEntry={!showPin}
                        keyboardType="default"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPin(!showPin)}
                        style={tw`p-1`}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={showPin ? 'eye-off-outline' : 'eye-outline'}
                          size={19}
                          color={COLORS.chocolateBrownMuted}
                        />
                      </TouchableOpacity>
                    </View>
                    {touched.pin && errors.pin && (
                      <Text style={tw`text-[11px] font-bold text-red-500 mt-1 ml-1`}>
                        {errors.pin}
                      </Text>
                    )}
                  </View>

                  {/* Submit Button */}
                  <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <TouchableOpacity
                      style={[
                        tw`w-full bg-strawberryPink py-4 rounded-2xl items-center justify-center flex-row gap-2 shadow-md`,
                        isSubmitting && tw`opacity-70`,
                      ]}
                      onPress={() => handleSubmit()}
                      onPressIn={() => animatePress(0.97)}
                      onPressOut={() => animatePress(1)}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                    >
                      {isSubmitting ? (
                        <>
                          <ActivityIndicator size="small" color={COLORS.chocolateBrown} />
                          <Text style={tw`text-base font-black text-chocolateBrown`}>
                            {t('authenticatingAdmin')}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="shield-checkmark" size={18} color={COLORS.chocolateBrown} />
                          <Text style={tw`text-base font-black text-chocolateBrown tracking-wide`}>
                            {t('accessAdminDashboard')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              )}
            </Formik>
          </View>

          {/* Bottom Link: Return to Welcome */}
          <TouchableOpacity
            onPress={onBack}
            style={tw`flex-row items-center gap-1.5 mt-6 py-2 px-4 rounded-full bg-vanillaCreamDark/50`}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={14} color={COLORS.chocolateBrown} />
            <Text style={tw`text-xs font-bold text-chocolateBrown`}>{t('backToWelcome')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

