import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { AppButton, AppCard, PaymentBadges } from '../components/ui';

interface WelcomeScreenProps {
  onGoToLogin: () => void;
  onGoToSignUp: () => void;
  onGoToAdminLogin: () => void;
}

export default function WelcomeScreen({
  onGoToLogin,
  onGoToSignUp,
  onGoToAdminLogin,
}: WelcomeScreenProps) {
  const { t } = useLanguage();

  const logoFade = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-24)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(18)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(badgeFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
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
    );
    loop.start();
    return () => loop.stop();
  }, [badgeFade, cardFade, cardSlide, floatAnim, logoFade, logoSlide, textFade, textSlide]);

  return (
    <SafeAreaView className="flex-1 bg-vanillaCream">
      <StatusBar style="dark" />

      {/* Decorative ambient blobs */}
      <View className="absolute w-64 h-64 rounded-full bg-strawberryPinkLight -top-24 -right-24 opacity-80" />
      <View className="absolute w-52 h-52 rounded-full bg-butterYellowLight -bottom-20 -left-20 opacity-80" />

      {/* Top Bar */}
      <View className="w-full flex-row justify-end px-5 pt-3 z-10">
        <LanguageSelector />
      </View>

      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center px-6 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* Emblem */}
        <Animated.View
          className="items-center mb-4"
          style={{
            opacity: logoFade,
            transform: [{ translateY: logoSlide }, { translateY: floatAnim }],
          }}
        >
          <View className="p-2.5 rounded-full bg-strawberryPinkLight/80 border border-borderSubtle">
            <View className="w-36 h-36 rounded-full bg-white items-center justify-center border-2 border-butterYellow/60 shadow-lg">
              <IceCreamEmblem />
            </View>
          </View>
        </Animated.View>

        {/* Brand Heading */}
        <Animated.View
          className="items-center mb-6"
          style={{ opacity: textFade, transform: [{ translateY: textSlide }] }}
        >
          <Text className="text-4xl font-black text-chocolateBrown tracking-tight text-center">
            {t('brandName')}
          </Text>
          <Text className="text-xs font-bold text-chocolateBrownLight mt-1 tracking-widest uppercase">
            {t('brandTagline')}
          </Text>

          <View className="flex-row items-center gap-2 my-3">
            <View className="w-2 h-2 rounded-full bg-strawberryPink" />
            <View className="w-2 h-2 rounded-full bg-butterYellow" />
            <View className="w-2 h-2 rounded-full bg-pistachioGreen" />
          </View>

          <Text className="text-sm font-semibold text-chocolateBrownMuted text-center">
            {t('gelato')} • {t('pancakes')}
          </Text>
        </Animated.View>

        {/* Main CTA Card */}
        <Animated.View
          className="w-full max-w-md"
          style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}
        >
          <AppCard variant="elevated" className="border-vanillaCreamDark">
            <Text className="text-xl font-black text-chocolateBrown text-center mb-1">
              {t('getStarted')}
            </Text>
            <Text className="text-xs font-medium text-chocolateBrownLight text-center mb-5 leading-4">
              {t('welcomeSubtitle')}
            </Text>

            <AppButton
              title={t('createAccountBtn')}
              icon="sparkles"
              variant="primary"
              size="lg"
              onPress={onGoToSignUp}
              className="mb-3"
            />

            <AppButton
              title={t('logIn')}
              icon="log-in-outline"
              variant="outline"
              size="lg"
              onPress={onGoToLogin}
            />

            {/* Divider */}
            <View className="flex-row items-center my-5">
              <View className="flex-1 h-px bg-vanillaCreamDark" />
              <Text className="mx-3 text-[11px] font-bold uppercase tracking-wider text-chocolateBrownMuted">
                {t('acceptedPayments')}
              </Text>
              <View className="flex-1 h-px bg-vanillaCreamDark" />
            </View>

            <PaymentBadges />
          </AppCard>
        </Animated.View>

        {/* Staff / Admin Portal Link */}
        <Animated.View className="mt-5" style={{ opacity: badgeFade }}>
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 bg-white/90 px-4 py-2.5 rounded-full border border-vanillaCreamDark shadow-sm"
            onPress={onGoToAdminLogin}
            activeOpacity={0.75}
          >
            <Ionicons name="shield-checkmark" size={15} color={COLORS.chocolateBrown} />
            <Text className="text-xs font-extrabold text-chocolateBrown">
              {t('staffPortalLink')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Offer Pill */}
        <Animated.View
          className="mt-4 bg-butterYellow px-5 py-2.5 rounded-full shadow-sm border border-amber-400/40"
          style={{ opacity: badgeFade }}
        >
          <Text className="text-xs font-extrabold text-chocolateBrown text-center">
            {t('newMemberOffer')}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Ice Cream Emblem (geometric shapes) ─────────────────────────────────────
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
      <View
        style={[
          emblemStyles.sprinkle,
          { top: 24, left: 8, backgroundColor: COLORS.butterYellow, transform: [{ rotate: '30deg' }] },
        ]}
      />
      <View
        style={[
          emblemStyles.sprinkle,
          { top: 30, right: 10, backgroundColor: COLORS.pistachioGreen, transform: [{ rotate: '-20deg' }] },
        ]}
      />
      <View
        style={[
          emblemStyles.sprinkle,
          { top: 44, left: 14, backgroundColor: COLORS.strawberryPink, transform: [{ rotate: '50deg' }] },
        ]}
      />
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
  scoop: { position: 'absolute', borderRadius: 60 },
  scoopBottom: { width: 56, height: 56, backgroundColor: COLORS.strawberryPink, bottom: 42 },
  scoopMiddle: { width: 50, height: 50, backgroundColor: '#F9C6D0', bottom: 66 },
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
  sprinkle: { position: 'absolute', width: 10, height: 3, borderRadius: 2 },
});
