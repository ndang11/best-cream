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

interface SignUpUserData {
  name: string;
  email: string;
}

interface SignUpScreenProps {
  onSignUpSuccess: (user: SignUpUserData) => void;
  onGoToLogin: () => void;
  apiUrl?: string;
}

export default function SignUpScreen({ onSignUpSuccess, onGoToLogin, apiUrl }: SignUpScreenProps) {
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
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (apiUrl) {
        const res = await fetch(`${apiUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
          }),
        });
        const json = await res.json();
        if (!json.success) {
          console.warn('Backend signup error:', json.error);
        }
      } else {
        await new Promise<void>((r) => setTimeout(r, 800));
      }
    } catch {
      console.log('Using demo sign-up due to offline server');
    } finally {
      setLoading(false);
      onSignUpSuccess({ name: fullName.trim(), email: email.trim() });
    }
  };

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
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow px-6 pt-4 pb-8 items-center`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top Bar ── */}
          <View style={tw`w-full flex-row items-center justify-between mb-4`}>
            <TouchableOpacity
              style={tw`bg-white px-3.5 py-2 rounded-2xl border border-vanillaCreamDark w-16 items-center shadow-sm`}
              onPress={onGoToLogin}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={tw`text-xs font-extrabold text-chocolateBrown`}>← Back</Text>
            </TouchableOpacity>

            <View style={tw`w-20 h-20 rounded-full bg-white items-center justify-center border-2 border-strawberryPinkLight shadow-md`}>
              <IceCreamEmblemSmall />
            </View>

            <View style={{ width: 64 }} />
          </View>

          {/* ── Heading ── */}
          <View style={tw`items-center mb-3`}>
            <Text style={tw`text-2xl font-extrabold text-chocolateBrown tracking-wide`}>
              Join Best Cream 🍦
            </Text>
            <Text style={tw`text-xs font-semibold text-chocolateBrownLight mt-1`}>
              Create your account and start ordering
            </Text>
          </View>

          {/* ── Offer Pill ── */}
          <View style={tw`bg-butterYellow rounded-full px-4 py-2 mb-4 shadow`}>
            <Text style={tw`text-xs font-extrabold text-chocolateBrown text-center`}>
              🎉 New members get 10% off their first order!
            </Text>
          </View>

          {/* ── Form Card ── */}
          <View style={tw`w-full bg-white rounded-3xl px-6 py-6 border border-vanillaCreamDark shadow-lg`}>
            {/* Full Name */}
            <Field
              label="Full Name"
              icon="👤"
              placeholder="e.g. John Doe"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                clearError('fullName');
              }}
              error={errors.fullName}
              returnKeyType="next"
            />

            {/* Email Address */}
            <Field
              label="Email Address"
              icon="✉️"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError('email');
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Phone Number */}
            <Field
              label="Phone Number"
              icon="📞"
              placeholder="+237 6XX XXX XXX"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                clearError('phone');
              }}
              error={errors.phone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            {/* Password */}
            <View style={tw`mb-3`}>
              <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>Password</Text>
              <View
                style={[
                  tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-3`,
                  errors.password ? tw`border-errorRed bg-errorRedLight` : null,
                ]}
              >
                <Text style={tw`text-base mr-2.5`}>🔒</Text>
                <TextInput
                  style={tw`flex-1 text-sm font-medium text-chocolateBrown`}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    clearError('password');
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Text style={tw`text-base pl-2`}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.password ? (
                <Text style={tw`text-xs text-errorRed font-semibold mt-1 ml-1`}>
                  {errors.password}
                </Text>
              ) : null}

              {/* Password strength indicator bar */}
              {password.length > 0 ? (
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
                  <Text style={[tw`text-xs font-extrabold text-right`, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View style={tw`mb-3`}>
              <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>Confirm Password</Text>
              <View
                style={[
                  tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-3`,
                  errors.confirmPassword ? tw`border-errorRed bg-errorRedLight` : null,
                ]}
              >
                <Text style={tw`text-base mr-2.5`}>✅</Text>
                <TextInput
                  style={tw`flex-1 text-sm font-medium text-chocolateBrown`}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.chocolateBrownMuted}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    clearError('confirmPassword');
                  }}
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                  <Text style={tw`text-base pl-2`}>{showConfirm ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.confirmPassword ? (
                <Text style={tw`text-xs text-errorRed font-semibold mt-1 ml-1`}>
                  {errors.confirmPassword}
                </Text>
              ) : null}
            </View>

            {/* Terms note */}
            <Text style={tw`text-xs text-chocolateBrownMuted text-center my-3 leading-4`}>
              By creating an account you agree to our{' '}
              <Text style={tw`text-strawberryPink font-bold`}>Terms of Service</Text>
              {' & '}
              <Text style={tw`text-strawberryPink font-bold`}>Privacy Policy</Text>
            </Text>

            {/* Create Account Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[
                  tw`w-full bg-strawberryPink py-4 rounded-2xl items-center shadow-md`,
                  loading && tw`opacity-70`,
                ]}
                onPress={handleSignUp}
                onPressIn={() => animatePress(0.96)}
                onPressOut={() => animatePress(1)}
                activeOpacity={1}
                disabled={loading}
              >
                <Text style={tw`text-base font-extrabold text-chocolateBrown tracking-wide`}>
                  {loading ? 'Creating Account…' : 'Create Account 🍦'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <View style={tw`flex-row justify-center items-center mt-4`}>
              <Text style={tw`text-sm font-medium text-chocolateBrownLight`}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={onGoToLogin} activeOpacity={0.7}>
                <Text style={tw`text-sm font-extrabold text-strawberryPink`}>
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Reusable Field Component ────────────────────────────────────────────────
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
    <View style={tw`mb-3`}>
      <Text style={tw`text-xs font-bold text-chocolateBrown mb-1.5`}>{label}</Text>
      <View
        style={[
          tw`flex-row items-center bg-vanillaCream rounded-2xl border border-vanillaCreamDark px-3.5 py-3`,
          error ? tw`border-errorRed bg-errorRedLight` : null,
        ]}
      >
        <Text style={tw`text-base mr-2.5`}>{icon}</Text>
        <TextInput
          style={tw`flex-1 text-sm font-medium text-chocolateBrown`}
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
      {error ? (
        <Text style={tw`text-xs text-errorRed font-semibold mt-1 ml-1`}>{error}</Text>
      ) : null}
    </View>
  );
}
