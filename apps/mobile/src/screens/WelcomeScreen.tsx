import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

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

  // Floating animation for the emblem
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
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

    // Continuous gentle float
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
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Decorative background blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <View style={styles.container}>

        {/* ── Top: Emblem + Brand name ── */}
        <Animated.View
          style={[
            styles.brandSection,
            {
              opacity: logoFade,
              transform: [{ translateY: logoSlide }, { translateY: floatAnim }],
            },
          ]}
        >
          {/* Outer glow ring */}
          <View style={styles.glowRing}>
            <View style={styles.emblemBubble}>
              <IceCreamEmblem />
            </View>
          </View>
        </Animated.View>

        {/* ── Tagline section ── */}
        <Animated.View
          style={[
            styles.headingSection,
            { opacity: textFade, transform: [{ translateY: textSlide }] },
          ]}
        >
          <Text style={styles.brandName}>Best Cream</Text>
          <Text style={styles.brandTagline}>Ice Cream & Pancakes</Text>
          <View style={styles.dotRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.strawberryPink }]} />
            <View style={[styles.dot, { backgroundColor: COLORS.butterYellow }]} />
            <View style={[styles.dot, { backgroundColor: COLORS.pistachioGreen }]} />
          </View>
          <Text style={styles.brandDescription}>
            Fresh flavors made daily.{'\n'}Order easily, pay instantly.
          </Text>
        </Animated.View>

        {/* ── CTA card ── */}
        <Animated.View
          style={[
            styles.ctaCard,
            { opacity: cardFade, transform: [{ translateY: cardSlide }] },
          ]}
        >
          <Text style={styles.ctaHeading}>Get Started</Text>
          <Text style={styles.ctaSubtext}>Create an account or log in to start ordering</Text>

          {/* Sign Up — primary */}
          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={onGoToSignUp}
            activeOpacity={0.85}
          >
            <Text style={styles.signUpBtnText}>Create Account</Text>
          </TouchableOpacity>

          {/* Log In — outline */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={onGoToLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Log In</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Accepted payments</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Payment badges */}
          <View style={styles.paymentRow}>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentEmoji}>📱</Text>
              <Text style={styles.paymentLabel}>MTN MoMo</Text>
            </View>
            <View style={styles.paymentDivider} />
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentEmoji}>🟠</Text>
              <Text style={styles.paymentLabel}>Orange Money</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Bottom offer pill ── */}
        <Animated.View style={[styles.offerPill, { opacity: badgeFade }]}>
          <Text style={styles.offerText}>🎉 New members get 10% off their first order!</Text>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

// ─── Ice cream emblem (pure RN) ───────────────────────────────────────────────
function IceCreamEmblem() {
  return (
    <View style={emblemStyles.wrapper}>
      {/* Waffle cone */}
      <View style={emblemStyles.cone} />
      {/* Scoops */}
      <View style={[emblemStyles.scoop, emblemStyles.scoopBottom]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopMiddle]} />
      <View style={[emblemStyles.scoop, emblemStyles.scoopTop]} />
      {/* Cherry */}
      <View style={emblemStyles.cherry} />
      {/* Chocolate drizzles */}
      <View style={emblemStyles.drizzle1} />
      <View style={emblemStyles.drizzle2} />
      {/* Sprinkles */}
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
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.vanillaCream,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 20,
  },

  // ── Decorative blobs ──
  blobTopRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.strawberryPinkLight,
    top: -80,
    right: -80,
  },
  blobBottomLeft: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.butterYellowLight,
    bottom: -60,
    left: -60,
  },

  // ── Brand ──
  brandSection: {
    alignItems: 'center',
  },
  glowRing: {
    padding: 8,
    borderRadius: 80,
    backgroundColor: COLORS.strawberryPinkLight,
  },
  emblemBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 3,
    borderColor: COLORS.strawberryPinkLight,
  },

  // ── Heading ──
  headingSection: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.chocolateBrownLight,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  brandDescription: {
    fontSize: 14,
    color: COLORS.chocolateBrownMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // ── CTA Card ──
  ctaCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: COLORS.chocolateBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  ctaHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    textAlign: 'center',
    marginBottom: 4,
  },
  ctaSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.chocolateBrownLight,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
  },

  // ── Buttons ──
  signUpBtn: {
    backgroundColor: COLORS.strawberryPink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.strawberryPink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  signUpBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.chocolateBrown,
    letterSpacing: 0.4,
  },
  loginBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.strawberryPink,
    backgroundColor: 'transparent',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.strawberryPink,
    letterSpacing: 0.4,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.vanillaCreamDark,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.chocolateBrownMuted,
  },

  // ── Payment badges ──
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  paymentEmoji: {
    fontSize: 22,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.chocolateBrownLight,
  },
  paymentDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.vanillaCreamDark,
    marginHorizontal: 16,
  },

  // ── Offer pill ──
  offerPill: {
    backgroundColor: COLORS.butterYellow,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: COLORS.butterYellow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  offerText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.chocolateBrown,
    textAlign: 'center',
  },
});

