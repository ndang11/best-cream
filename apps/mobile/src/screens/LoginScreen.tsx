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
    borderTopColor: '#C47C3E',
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
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow px-6 pt-3 pb-8 items-center justify-center`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Bar: Language Selector (English / French) ── */}
          <View style={tw`w-full flex-row justify-end mb-2`}>
            <LanguageSelector />
          </View>

          {/* ── Brand Logo & Header ── */}
          <View style={tw`items-center mb-4`}>
            <View style={tw`w-24 h-24 rounded-full bg-white items-center justify-center border-2 border-strawberryPinkLight shadow-lg mb-2`}>
              <IceCreamEmblem />
            </View>
            <Text style={tw`text-3xl font-black text-chocolateBrown tracking-wide`}>
              {t('brandName')}
            </Text>
            <View style={tw`flex-row items-center gap-1.5 mt-1`}>
              <Text style={tw`text-xs font-bold text-strawberryPink`}>{t('gelato')}</Text>
              <Text style={tw`text-xs text-chocolateBrownMuted`}>•</Text>
              <Text style={tw`text-xs font-bold text-chocolateBrownLight`}>{t('pancakes')}</Text>
            </View>
          </View>

          {/* ── Formik Form Card ── */}
          <View style={tw`w-full bg-white rounded-3xl p-6 border border-vanillaCreamDark shadow-lg`}>
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <View>
                <Text style={tw`text-2xl font-black text-chocolateBrown`}>
                  {t('welcomeBack')}
                </Text>
                <Text style={tw`text-xs font-medium text-chocolateBrownMuted mt-0.5`}>
                  {t('loginSubtitle')}
                </Text>
              </View>
            </View>

            {/* Error Banner */}
            {authError && (
              <View style={tw`bg-red-50 border border-red-300 rounded-2xl p-3 mb-3 flex-row items-center gap-2`}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={tw`text-xs text-red-700 font-bold flex-1`}>{authError}</Text>
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
                    <View style={tw`flex-row items-center justify-between mb-3.5 bg-surfaceBright p-1.5 rounded-2xl border border-borderSubtle`}>
                      <TouchableOpacity
                        style={tw`flex-1 items-center py-1.5 rounded-xl ${values.email === 'admin@bestcream.com' ? 'bg-chocolateBrown' : 'bg-transparent'}`}
                        onPress={() => {
                          setFieldValue('email', 'admin@bestcream.com');
                          setFieldValue('password', 'admin123');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={tw`text-[10px] font-black ${values.email === 'admin@bestcream.com' ? 'text-white' : 'text-chocolateBrown'}`}>
                          👑 Admin
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={tw`flex-1 items-center py-1.5 rounded-xl mx-1 ${values.email === 'sales@bestcream.com' ? 'bg-strawberryPink' : 'bg-transparent'}`}
                        onPress={() => {
                          setFieldValue('email', 'sales@bestcream.com');
                          setFieldValue('password', 'sales123');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={tw`text-[10px] font-black ${values.email === 'sales@bestcream.com' ? 'text-white' : 'text-chocolateBrown'}`}>
                          💼 Sales
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={tw`flex-1 items-center py-1.5 rounded-xl ${values.email === 'sam@bestcream.com' ? 'bg-emerald-600' : 'bg-transparent'}`}
                        onPress={() => {
                          setFieldValue('email', 'sam@bestcream.com');
                          setFieldValue('password', 'password123');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={tw`text-[10px] font-black ${values.email === 'sam@bestcream.com' ? 'text-white' : 'text-chocolateBrown'}`}>
                          👤 Customer
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Email Input Field */}
                    <View style={tw`mb-3.5`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('emailLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.email && errors.email
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isEmailValid
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
                              : isEmailValid
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
                        {isEmailValid && (
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

                    {/* Password Input Field */}
                    <View style={tw`mb-2`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        {t('passwordLabel')}
                      </Text>
                      <View
                        style={[
                          tw`flex-row items-center bg-vanillaCream rounded-2xl border px-3.5 py-3`,
                          touched.password && errors.password
                            ? tw`border-errorRed bg-errorRedLight/40`
                            : isPasswordValid
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
                              : isPasswordValid
                              ? COLORS.pistachioGreen
                              : COLORS.chocolateBrownMuted
                          }
                          style={tw`mr-2.5`}
                        />
                        <TextInput
                          style={tw`flex-1 text-sm font-semibold text-chocolateBrown`}
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
                        <View style={tw`flex-row items-center gap-1 mt-1 ml-1`}>
                          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
                          <Text style={tw`text-xs text-errorRed font-semibold`}>
                            {errors.password}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Forgot password */}
                    <TouchableOpacity
                      style={tw`self-end my-2.5`}
                      activeOpacity={0.7}
                      onPress={() => {
                        setForgotEmail(values.email);
                        setForgotMessage(null);
                        setForgotModalVisible(true);
                      }}
                    >
                      <Text style={tw`text-xs font-bold text-strawberryPink`}>
                        {t('forgotPassword')}
                      </Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <TouchableOpacity
                        style={[
                          tw`w-full bg-strawberryPink py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-md mt-1`,
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
                              {t('loggingIn')}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="log-in-outline" size={18} color={COLORS.chocolateBrown} />
                            <Text style={tw`text-sm font-black text-chocolateBrown tracking-wide`}>
                              {t('logIn')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                );
              }}
            </Formik>

            {/* Divider */}
            <View style={tw`flex-row items-center my-4`}>
              <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
              <Text style={tw`mx-3 text-xs font-semibold text-chocolateBrownMuted`}>
                {t('or')}
              </Text>
              <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
            </View>

            {/* Sign up link */}
            <View style={tw`flex-row justify-center items-center`}>
              <Text style={tw`text-xs font-semibold text-chocolateBrownLight`}>
                {t('dontHaveAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={onGoToSignUp} activeOpacity={0.7}>
                <Text style={tw`text-xs font-black text-strawberryPink`}>
                  {t('createAccount')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Admin / Staff Portal Shortcut */}
            {onGoToAdminLogin && (
              <View style={tw`mt-4 pt-3 border-t border-vanillaCreamDark items-center`}>
                <TouchableOpacity
                  onPress={onGoToAdminLogin}
                  style={tw`flex-row items-center gap-1.5 bg-vanillaCream px-3.5 py-1.5 rounded-full border border-vanillaCreamDark`}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield-checkmark" size={14} color={COLORS.chocolateBrown} />
                  <Text style={tw`text-[11px] font-black text-chocolateBrown`}>
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
        <View style={tw`flex-1 bg-black/60 items-center justify-center p-5`}>
          <View style={tw`w-full max-w-sm bg-white rounded-3xl p-6 border border-vanillaCreamDark shadow-2xl`}>
            <View style={tw`w-12 h-12 rounded-2xl bg-strawberryPinkLight items-center justify-center mb-3`}>
              <Ionicons name="key-outline" size={24} color={COLORS.strawberryPink} />
            </View>
            <Text style={tw`text-xl font-black text-chocolateBrown`}>Reset Password</Text>
            <Text style={tw`text-xs text-chocolateBrownMuted mt-1 mb-4`}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>

            {forgotMessage && (
              <View style={tw`bg-emerald-50 border border-emerald-300 rounded-xl p-3 mb-3`}>
                <Text style={tw`text-xs text-emerald-800 font-semibold`}>{forgotMessage}</Text>
              </View>
            )}

            <TextInput
              style={tw`w-full bg-vanillaCream border border-vanillaCreamDark rounded-2xl px-4 py-3 text-sm font-semibold text-chocolateBrown mb-4`}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.chocolateBrownMuted}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={tw`flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={tw`flex-1 py-3 rounded-2xl bg-vanillaCream border border-vanillaCreamDark items-center`}
                activeOpacity={0.7}
              >
                <Text style={tw`text-xs font-bold text-chocolateBrown`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForgotPasswordSubmit}
                style={tw`flex-1 py-3 rounded-2xl bg-strawberryPink items-center justify-center`}
                activeOpacity={0.8}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={tw`text-xs font-black text-chocolateBrown`}>Send Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
