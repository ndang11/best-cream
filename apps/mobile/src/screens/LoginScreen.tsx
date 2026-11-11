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

interface LoginUserData {
  name?: string;
  email: string;
}

interface LoginScreenProps {
  onLoginSuccess: (user: LoginUserData) => void;
  onGoToSignUp: () => void;
  apiUrl?: string;
}

export default function LoginScreen({ onLoginSuccess, onGoToSignUp, apiUrl }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

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
    let resolvedName = '';
    const cleanEmail = email.trim();
    // Default name from email prefix (e.g. "alex.smith@..." -> "Alex")
    const fallbackName = cleanEmail.split('@')[0].split(/[._-]/)[0];
    resolvedName = fallbackName ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) : 'Customer';

    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const json = await res.json();
        if (json.success && json.data?.user?.user_metadata?.full_name) {
          resolvedName = json.data.user.user_metadata.full_name;
        } else if (!json.success) {
          console.warn('Backend login message:', json.error);
        }
      } else {
        await new Promise<void>((r) => setTimeout(r, 800));
      }
    } catch {
      console.log('Using demo sign-in due to offline server');
    } finally {
      setLoading(false);
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
          contentContainerStyle={tw`flex-grow px-6 pt-5 pb-8 items-center`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top brand section ── */}
          <View style={tw`items-center mb-6`}>
            <View style={tw`w-28 h-28 rounded-full bg-white items-center justify-center border-2 border-strawberryPinkLight shadow-lg mb-3`}>
              <IceCreamEmblem />
            </View>
            <Text style={tw`text-3xl font-extrabold text-chocolateBrown tracking-wide`}>
              Best Cream
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrownLight mt-1 tracking-wider`}>
              Ice Cream & Pancakes
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={tw`w-full bg-white rounded-3xl px-6 py-7 border border-vanillaCreamDark shadow-lg`}>
            <Text style={tw`text-2xl font-extrabold text-chocolateBrown mb-1`}>
              Welcome Back 👋
            </Text>
            <Text style={tw`text-xs font-medium text-chocolateBrownLight mb-6 leading-4`}>
              Log in to your account to continue
            </Text>

            {/* Email Field */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs font-bold text-chocolateBrown mb-2`}>
                Email Address
              </Text>
              <View
                style={[
                  tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-3`,
                  emailError ? tw`border-errorRed bg-errorRedLight` : null,
                ]}
              >
                <Text style={tw`text-base mr-2.5`}>✉️</Text>
                <TextInput
                  style={tw`flex-1 text-sm font-medium text-chocolateBrown`}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {emailError ? (
                <Text style={tw`text-xs text-errorRed font-semibold mt-1 ml-1`}>
                  {emailError}
                </Text>
              ) : null}
            </View>

            {/* Password Field */}
            <View style={tw`mb-2`}>
              <Text style={tw`text-xs font-bold text-chocolateBrown mb-2`}>
                Password
              </Text>
              <View
                style={[
                  tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-3`,
                  passwordError ? tw`border-errorRed bg-errorRedLight` : null,
                ]}
              >
                <Text style={tw`text-base mr-2.5`}>🔒</Text>
                <TextInput
                  style={tw`flex-1 text-sm font-medium text-chocolateBrown`}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={tw`text-base pl-2`}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {passwordError ? (
                <Text style={tw`text-xs text-errorRed font-semibold mt-1 ml-1`}>
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Forgot password */}
            <TouchableOpacity style={tw`self-end my-3`} activeOpacity={0.7}>
              <Text style={tw`text-xs font-bold text-strawberryPink`}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[
                  tw`w-full bg-strawberryPink py-4 rounded-2xl items-center shadow-md`,
                  loading && tw`opacity-70`,
                ]}
                onPress={handleLogin}
                onPressIn={() => animatePress(0.96)}
                onPressOut={() => animatePress(1)}
                activeOpacity={1}
                disabled={loading}
              >
                <Text style={tw`text-base font-extrabold text-chocolateBrown tracking-wide`}>
                  {loading ? 'Logging in…' : 'Log In'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={tw`flex-row items-center my-5`}>
              <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
              <Text style={tw`mx-3 text-xs font-semibold text-chocolateBrownMuted`}>
                or
              </Text>
              <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
            </View>

            {/* Sign up link */}
            <View style={tw`flex-row justify-center items-center`}>
              <Text style={tw`text-sm font-medium text-chocolateBrownLight`}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={onGoToSignUp} activeOpacity={0.7}>
                <Text style={tw`text-sm font-extrabold text-strawberryPink`}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
