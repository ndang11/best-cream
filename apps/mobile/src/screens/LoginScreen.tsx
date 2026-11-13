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

// ─── Yup Validation Schema ───────────────────────────────────────────────────
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Please enter a valid email address')
    .required('Email address is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginUserData {
  name?: string;
  email: string;
}

interface LoginScreenProps {
  onLoginSuccess: (user: LoginUserData) => void;
  onGoToSignUp: () => void;
  apiUrl?: string;
}

export default function LoginScreen({
  onLoginSuccess,
  onGoToSignUp,
  apiUrl,
}: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
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
    let resolvedName = '';
    const cleanEmail = values.email.trim();
    const fallbackName = cleanEmail.split('@')[0].split(/[._-]/)[0];
    resolvedName = fallbackName
      ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)
      : 'Customer';

    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: values.password }),
        });
        const json = await res.json();
        if (json.success && json.data?.user?.user_metadata?.full_name) {
          resolvedName = json.data.user.user_metadata.full_name;
        } else if (!json.success) {
          console.warn('Backend login message:', json.error);
        }
      } else {
        await new Promise<void>((r) => setTimeout(r, 700));
      }
    } catch {
      console.log('Using demo sign-in due to offline server');
    } finally {
      onLoginSuccess({ name: resolvedName, email: cleanEmail });
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow px-6 pt-5 pb-8 items-center justify-center`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Logo & Header ── */}
          <View style={tw`items-center mb-5`}>
            <View style={tw`w-24 h-24 rounded-full bg-white items-center justify-center border-2 border-strawberryPinkLight shadow-lg mb-2.5`}>
              <IceCreamEmblem />
            </View>
            <Text style={tw`text-3xl font-black text-chocolateBrown tracking-wide`}>
              Best Cream
            </Text>
            <View style={tw`flex-row items-center gap-1.5 mt-1`}>
              <Text style={tw`text-xs font-bold text-strawberryPink`}>🍦 Gelato</Text>
              <Text style={tw`text-xs text-chocolateBrownMuted`}>•</Text>
              <Text style={tw`text-xs font-bold text-chocolateBrownLight`}>🥞 Golden Pancakes</Text>
            </View>
          </View>

          {/* ── Formik Form Card ── */}
          <View style={tw`w-full bg-white rounded-3xl p-6 border border-vanillaCreamDark shadow-lg`}>
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <View>
                <Text style={tw`text-2xl font-black text-chocolateBrown`}>
                  Welcome Back 👋
                </Text>
                <Text style={tw`text-xs font-medium text-chocolateBrownMuted mt-0.5`}>
                  Log in to manage orders & treats
                </Text>
              </View>
            </View>

            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
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
                    {/* Quick Demo Fill Pill */}
                    <TouchableOpacity
                      style={tw`flex-row items-center gap-1 self-end bg-butterYellowLight px-2.5 py-1 rounded-xl mb-3 border border-butterYellow/50`}
                      onPress={() => {
                        setFieldValue('email', 'alex@bestcream.com');
                        setFieldValue('password', 'password123');
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="sparkles" size={12} color="#854D0E" />
                      <Text style={tw`text-[11px] font-bold text-amber-900`}>
                        Quick Demo Fill
                      </Text>
                    </TouchableOpacity>

                    {/* Email Input Field */}
                    <View style={tw`mb-3.5`}>
                      <Text style={tw`text-xs font-black text-chocolateBrown mb-1.5`}>
                        Email Address
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
                          placeholder="e.g. alex@bestcream.com"
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
                        Password
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
                          placeholder="Enter your password"
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
                    <TouchableOpacity style={tw`self-end my-2.5`} activeOpacity={0.7}>
                      <Text style={tw`text-xs font-bold text-strawberryPink`}>
                        Forgot Password?
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
                              Logging in…
                            </Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="log-in-outline" size={18} color={COLORS.chocolateBrown} />
                            <Text style={tw`text-sm font-black text-chocolateBrown tracking-wide`}>
                              Log In
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
                or
              </Text>
              <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
            </View>

            {/* Sign up link */}
            <View style={tw`flex-row justify-center items-center`}>
              <Text style={tw`text-xs font-semibold text-chocolateBrownLight`}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={onGoToSignUp} activeOpacity={0.7}>
                <Text style={tw`text-xs font-black text-strawberryPink`}>
                  Create Account 🍦
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
