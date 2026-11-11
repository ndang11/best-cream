import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';

interface WelcomeScreenProps {
  onGoToLogin: () => void;
  onGoToSignUp: () => void;
}

export default function WelcomeScreen({ onGoToLogin, onGoToSignUp }: WelcomeScreenProps) {
  // Entrance animations
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-30)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(20)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;

  // Floating animation for emblem
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(badgeFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle floating loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-vanillaCream`}>
      <StatusBar style="dark" />

      {/* Decorative background blobs */}
      <View style={tw`absolute w-56 h-56 rounded-full bg-strawberryPinkLight -top-20 -right-20`} />
      <View style={tw`absolute w-44 h-44 rounded-full bg-butterYellowLight -bottom-16 -left-16`} />

      <View style={tw`flex-1 items-center justify-center px-6 py-4`}>
        {/* ── Top: Emblem + Brand name ── */}
        <Animated.View
          style={[
            tw`items-center mb-4`,
            {
              opacity: logoFade,
              transform: [{ translateY: logoSlide }, { translateY: floatAnim }],
            },
          ]}
        >
          <View style={tw`p-2 rounded-full bg-strawberryPinkLight`}>
            <View style={tw`w-36 h-36 rounded-full bg-white items-center justify-center border-2 border-strawberryPinkLight shadow-lg`}>
              <IceCreamEmblem />
            </View>
          </View>
        </Animated.View>

        {/* ── Heading section ── */}
        <Animated.View
          style={[
            tw`items-center mb-6`,
            { opacity: textFade, transform: [{ translateY: textSlide }] },
          ]}
        >
          <Text style={tw`text-4xl font-extrabold text-chocolateBrown tracking-wide`}>
            Best Cream
          </Text>
          <Text style={tw`text-sm font-semibold text-chocolateBrownLight mt-1 tracking-wider`}>
            Ice Cream & Pancakes
          </Text>
          <View style={tw`flex-row gap-2 my-2.5`}>
            <View style={tw`w-1.5 h-1.5 rounded-full bg-strawberryPink`} />
            <View style={tw`w-1.5 h-1.5 rounded-full bg-butterYellow`} />
            <View style={tw`w-1.5 h-1.5 rounded-full bg-pistachioGreen`} />
          </View>
          <Text style={tw`text-sm font-medium text-chocolateBrownMuted text-center leading-5`}>
            Fresh flavors made daily.{'\n'}Order easily, pay instantly.
          </Text>
        </Animated.View>

        {/* ── CTA Card ── */}
        <Animated.View
          style={[
            tw`w-full bg-white rounded-3xl px-6 py-7 border border-vanillaCreamDark shadow-lg`,
            { opacity: cardFade, transform: [{ translateY: cardSlide }] },
          ]}
        >
          <Text style={tw`text-xl font-extrabold text-chocolateBrown text-center mb-1`}>
            Get Started
          </Text>
          <Text style={tw`text-xs font-medium text-chocolateBrownLight text-center mb-5`}>
            Create an account or log in to start ordering
          </Text>

          {/* Sign Up — Primary Button */}
          <TouchableOpacity
            style={tw`w-full bg-strawberryPink py-4 rounded-2xl items-center mb-3 shadow-md`}
            onPress={onGoToSignUp}
            activeOpacity={0.85}
          >
            <Text style={tw`text-base font-extrabold text-chocolateBrown tracking-wide`}>
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Log In — Secondary Outline Button */}
          <TouchableOpacity
            style={tw`w-full border-2 border-strawberryPink py-3.5 rounded-2xl items-center bg-transparent`}
            onPress={onGoToLogin}
            activeOpacity={0.85}
          >
            <Text style={tw`text-base font-extrabold text-strawberryPink tracking-wide`}>
              Log In
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={tw`flex-row items-center my-4`}>
            <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
            <Text style={tw`mx-2.5 text-xs font-semibold text-chocolateBrownMuted`}>
              Accepted payments
            </Text>
            <View style={tw`flex-1 h-px bg-vanillaCreamDark`} />
          </View>

          {/* Payment Badges */}
          <View style={tw`flex-row items-center justify-center`}>
            <View style={tw`flex-1 items-center gap-1`}>
              <Text style={tw`text-2xl`}>📱</Text>
              <Text style={tw`text-xs font-bold text-chocolateBrownLight`}>MTN MoMo</Text>
            </View>
            <View style={tw`w-px h-8 bg-vanillaCreamDark mx-4`} />
            <View style={tw`flex-1 items-center gap-1`}>
              <Text style={tw`text-2xl`}>🟠</Text>
              <Text style={tw`text-xs font-bold text-chocolateBrownLight`}>Orange Money</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Bottom Offer Pill ── */}
        <Animated.View style={[tw`mt-5 bg-butterYellow px-5 py-2.5 rounded-full shadow`, { opacity: badgeFade }]}>
          <Text style={tw`text-xs font-extrabold text-chocolateBrown text-center`}>
            🎉 New members get 10% off their first order!
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Ice Cream Emblem ────────────────────────────────────────────────────────
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
      <View style={[emblemStyles.sprinkle, { top: 24, left: 8, backgroundColor: COLORS.butterYellow, transform: [{ rotate: '30deg' }] }]} />
      <View style={[emblemStyles.sprinkle, { top: 30, right: 10, backgroundColor: COLORS.pistachioGreen, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[emblemStyles.sprinkle, { top: 44, left: 14, backgroundColor: COLORS.strawberryPink, transform: [{ rotate: '50deg' }] }]} />
    </View>
  );
}

const emblemStyles = StyleSheet.create({
  wrapper: {
    width: 90,
    height: 110,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderTopWidth: 54,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4854A',
  },
  scoop: {
    position: 'absolute',
    borderRadius: 60,
  },
  scoopBottom: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.strawberryPink,
    bottom: 42,
  },
  scoopMiddle: {
    width: 50,
    height: 50,
    backgroundColor: '#F9C6D0',
    bottom: 66,
  },
  scoopTop: {
    width: 42,
    height: 42,
    backgroundColor: COLORS.vanillaCream,
    bottom: 86,
    borderWidth: 2,
    borderColor: COLORS.vanillaCreamDark,
  },
  cherry: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E53935',
    bottom: 122,
  },
  drizzle1: {
    position: 'absolute',
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateBrown,
    bottom: 80,
    left: 12,
    transform: [{ rotate: '-18deg' }],
  },
  drizzle2: {
    position: 'absolute',
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateBrown,
    bottom: 70,
    right: 14,
    transform: [{ rotate: '14deg' }],
  },
  sprinkle: {
    position: 'absolute',
    width: 10,
    height: 3,
    borderRadius: 2,
  },
});
