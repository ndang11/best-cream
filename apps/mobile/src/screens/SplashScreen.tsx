import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const LOADING_DURATION_MS = 8000; // 8 seconds

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // Animation drivers
  const emblemFadeAnim = useRef(new Animated.Value(0)).current;
  const emblemScaleAnim = useRef(new Animated.Value(0.9)).current;
  const emblemFloatAnim = useRef(new Animated.Value(0)).current;

  // Title animations (entrance + continuous subtle breathing/glow)
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleScaleAnim = useRef(new Animated.Value(0.85)).current;
  const titlePulseAnim = useRef(new Animated.Value(1)).current;

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bottomFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance Animations Sequence
    Animated.parallel([
      // Emblem entrance
      Animated.timing(emblemFadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(emblemScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),

      // "Best Cream" title entrance
      Animated.timing(titleFadeAnim, {
        toValue: 1,
        duration: 900,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(titleScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 45,
        delay: 250,
        useNativeDriver: true,
      }),

      // Bottom section fade in
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Emblem Gentle Floating Loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(emblemFloatAnim, {
          toValue: -8,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(emblemFloatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // 3. "Best Cream" Continuous Breathing Pulse Animation
    const titlePulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(titlePulseAnim, {
          toValue: 1.05,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(titlePulseAnim, {
          toValue: 1.0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    titlePulseLoop.start();

    // 4. 8-Second Smooth Progress Loading
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: LOADING_DURATION_MS,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && onFinish) {
        setTimeout(() => {
          onFinish();
        }, 300);
      }
    });

    return () => {
      floatLoop.stop();
      titlePulseLoop.stop();
    };
  }, [
    emblemFadeAnim,
    emblemScaleAnim,
    emblemFloatAnim,
    titleFadeAnim,
    titleScaleAnim,
    titlePulseAnim,
    bottomFadeAnim,
    progressAnim,
    onFinish,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.safeArea, tw`flex-1 bg-vanillaCream`]}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        {/* Soft Ambient Radial Lights */}
        <View style={styles.ambientGlowCenter} />
        <View style={styles.ambientGlowTop} />
        <View style={styles.ambientGlowBottom} />

        {/* Center: Hero Emblem & Animated "Best Cream" */}
        <View style={styles.centerSection}>
          {/* Ice Cream Emblem */}
          <Animated.View
            style={[
              styles.crestWrapper,
              {
                opacity: emblemFadeAnim,
                transform: [
                  { scale: emblemScaleAnim },
                  { translateY: emblemFloatAnim },
                ],
              },
            ]}
          >
            <View style={styles.crestOuterRing}>
              <View style={styles.crestInnerDisc}>
                <View style={styles.iconComposition}>
                  {/* Cherry on top */}
                  <View style={styles.cherry}>
                    <View style={styles.cherryStem} />
                    <View style={styles.cherryGloss} />
                  </View>

                  {/* Top Chocolate Scoop */}
                  <View style={styles.scoopTop}>
                    <View style={styles.scoopFudgeGloss} />
                  </View>

                  {/* Dual Lower Scoops */}
                  <View style={styles.scoopRow}>
                    <View style={styles.scoopVanilla} />
                    <View style={styles.scoopStrawberry} />
                  </View>

                  {/* Golden Waffle Cone */}
                  <View style={styles.coneBody}>
                    <View style={styles.coneGridLine1} />
                    <View style={styles.coneGridLine2} />
                    <View style={styles.coneGridLine3} />
                  </View>
                </View>

                {/* Delicate Star Accents */}
                <Text style={styles.starAccentLeft}>✦</Text>
                <Text style={styles.starAccentRight}>✦</Text>
              </View>
            </View>
          </Animated.View>

          {/* Animated "Best Cream" Title */}
          <Animated.View
            style={[
              styles.titleWrapper,
              {
                opacity: titleFadeAnim,
                transform: [
                  { scale: Animated.multiply(titleScaleAnim, titlePulseAnim) },
                ],
              },
            ]}
          >
            <Text style={styles.brandTitleShadow}>Best Cream</Text>
            <Text style={styles.brandTitle}>Best Cream</Text>
          </Animated.View>
        </View>

        {/* Lower Third: Standalone Loading Bar + Official Logos */}
        <Animated.View style={[styles.bottomSection, { opacity: bottomFadeAnim }]}>
          {/* Standalone 8-Second Progress Bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth },
              ]}
            />
          </View>

          {/* MTN MoMo & Orange Money Official Badges */}
          <View style={styles.logosRow}>
            {/* MTN Mobile Money Logo */}
            <View style={styles.momoCard}>
              <View style={styles.momoPill}>
                <View style={styles.momoOval}>
                  <Text style={styles.momoText}>MoMo</Text>
                </View>
                <Text style={styles.mtnText}>MTN</Text>
              </View>
            </View>

            {/* Orange Money Logo */}
            <View style={styles.orangeCard}>
              <View style={styles.orangePill}>
                <View style={styles.orangeSquareIcon}>
                  <View style={styles.orangeInnerSquare} />
                </View>
                <View style={styles.orangeTextColumn}>
                  <Text style={styles.orangeBrandText}>orange</Text>
                  <Text style={styles.orangeMoneyText}>money</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFDF5', // Pure Vanilla Cream
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    position: 'relative',
    overflow: 'hidden',
  },

  // --------------------------------------------------------------------------
  // Subtle Ambient Background Glows
  // --------------------------------------------------------------------------
  ambientGlowCenter: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: '#FFF4DE',
    top: '28%',
    opacity: 0.6,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFEBF0',
    opacity: 0.4,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FFF0D4',
    opacity: 0.5,
  },

  // --------------------------------------------------------------------------
  // Center Section: Hero Emblem & Animated Title
  // --------------------------------------------------------------------------
  centerSection: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 'auto',
  },

  // Luxury Brand Crest
  crestWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  crestOuterRing: {
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFD166',
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 8,
  },
  crestInnerDisc: {
    flex: 1,
    borderRadius: 76,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#F3E5D4',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  // Ice cream composition inside disc
  iconComposition: {
    alignItems: 'center',
    marginTop: -4,
  },
  cherry: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D90429',
    position: 'relative',
    marginBottom: -4,
    zIndex: 5,
    shadowColor: '#D90429',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  cherryStem: {
    position: 'absolute',
    top: -8,
    right: 3,
    width: 2,
    height: 9,
    backgroundColor: '#2D1E18',
    transform: [{ rotate: '25deg' }],
    borderRadius: 1,
  },
  cherryGloss: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.75,
  },
  scoopTop: {
    width: 46,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4A2810',
    zIndex: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  scoopFudgeGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: '#2C1608',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  scoopRow: {
    flexDirection: 'row',
    width: 70,
    justifyContent: 'space-between',
    marginTop: -14,
    zIndex: 3,
  },
  scoopVanilla: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#EFE1C9',
  },
  scoopStrawberry: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF85A1',
  },
  coneBody: {
    width: 46,
    height: 40,
    backgroundColor: '#E59B38',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 23,
    borderBottomRightRadius: 23,
    marginTop: -7,
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: '#C67A18',
    overflow: 'hidden',
    position: 'relative',
  },
  coneGridLine1: {
    position: 'absolute',
    width: 55,
    height: 1.5,
    backgroundColor: '#C67A18',
    top: 8,
    transform: [{ rotate: '25deg' }],
  },
  coneGridLine2: {
    position: 'absolute',
    width: 55,
    height: 1.5,
    backgroundColor: '#C67A18',
    top: 19,
    transform: [{ rotate: '-25deg' }],
  },
  coneGridLine3: {
    position: 'absolute',
    width: 55,
    height: 1.5,
    backgroundColor: '#C67A18',
    top: 28,
    transform: [{ rotate: '25deg' }],
  },

  starAccentLeft: {
    position: 'absolute',
    left: 14,
    top: 24,
    fontSize: 11,
    color: '#FFD166',
  },
  starAccentRight: {
    position: 'absolute',
    right: 14,
    top: 24,
    fontSize: 11,
    color: '#FFD166',
  },

  // Animated "Best Cream" Title
  titleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleShadow: {
    position: 'absolute',
    top: 2,
    fontSize: 46,
    fontWeight: '900',
    color: '#FFE2C4',
    letterSpacing: -0.8,
  },
  brandTitle: {
    fontSize: 46,
    fontWeight: '900',
    color: '#2D1B17', // Rich artisanal chocolate brown
    letterSpacing: -0.8,
    textAlign: 'center',
  },

  // --------------------------------------------------------------------------
  // Lower Third: Standalone Loading Bar & Payment Logos
  // --------------------------------------------------------------------------
  bottomSection: {
    width: '100%',
    maxWidth: 290,
    alignItems: 'center',
    paddingBottom: 24,
  },

  // Sleek Standalone Progress Bar
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3D5',
    overflow: 'hidden',
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 24,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6584',
    borderRadius: 3,
  },

  // Logos Row
  logosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  // 1. Official MTN MoMo Logo Badge
  momoCard: {
    backgroundColor: '#FFCC00', // Iconic MTN Yellow
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E6B800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  momoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  momoOval: {
    backgroundColor: '#004F71', // Deep MTN Navy Blue
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  momoText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFCC00',
    letterSpacing: 0.2,
  },
  mtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#002B49',
    letterSpacing: 0.5,
  },

  // 2. Official Orange Money Logo Badge
  orangeCard: {
    backgroundColor: '#1E1E1E', // Modern dark background for Orange contrast
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  orangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  orangeSquareIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#FF7900', // Official Orange brand color
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeInnerSquare: {
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  orangeTextColumn: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  orangeBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  orangeMoneyText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF7900',
    letterSpacing: -0.2,
  },
});
