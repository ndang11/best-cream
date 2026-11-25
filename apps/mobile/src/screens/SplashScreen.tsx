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
import { PaymentBadges } from '../components/ui';

const { width } = Dimensions.get('window');
const LOADING_DURATION_MS = 8000;

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const emblemFadeAnim = useRef(new Animated.Value(0)).current;
  const emblemScaleAnim = useRef(new Animated.Value(0.9)).current;
  const emblemFloatAnim = useRef(new Animated.Value(0)).current;
  const titleFadeAnim = useRef(new Animated.Value(0)).current;
  const titleScaleAnim = useRef(new Animated.Value(0.85)).current;
  const titlePulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bottomFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
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
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

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
    <SafeAreaView className="flex-1 bg-[#FFFDF5]">
      <StatusBar style="dark" />

      <View className="flex-1 justify-between items-center px-7 py-8 relative overflow-hidden">
        {/* Soft Ambient Radial Lights */}
        <View
          style={{
            position: 'absolute',
            width: width * 0.9,
            height: width * 0.9,
            borderRadius: (width * 0.9) / 2,
            backgroundColor: '#FFF4DE',
            top: '28%',
            opacity: 0.6,
          }}
        />
        <View className="absolute -top-20 -right-16 w-60 h-60 rounded-full bg-strawberryPinkLight opacity-40" />
        <View className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#FFF0D4] opacity-50" />

        {/* Center Hero Emblem & Animated "Best Cream" */}
        <View className="items-center w-full my-auto">
          <Animated.View
            className="items-center justify-center mb-6"
            style={{
              opacity: emblemFadeAnim,
              transform: [{ scale: emblemScaleAnim }, { translateY: emblemFloatAnim }],
            }}
          >
            <View style={styles.crestOuterRing}>
              <View style={styles.crestInnerDisc}>
                <View style={styles.iconComposition}>
                  <View style={styles.cherry}>
                    <View style={styles.cherryStem} />
                    <View style={styles.cherryGloss} />
                  </View>
                  <View style={styles.scoopTop}>
                    <View style={styles.scoopFudgeGloss} />
                  </View>
                  <View style={styles.scoopRow}>
                    <View style={styles.scoopVanilla} />
                    <View style={styles.scoopStrawberry} />
                  </View>
                  <View style={styles.coneBody}>
                    <View style={styles.coneGridLine1} />
                    <View style={styles.coneGridLine2} />
                    <View style={styles.coneGridLine3} />
                  </View>
                </View>
                <Text style={styles.starAccentLeft}>✦</Text>
                <Text style={styles.starAccentRight}>✦</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            className="relative items-center justify-center"
            style={{
              opacity: titleFadeAnim,
              transform: [{ scale: Animated.multiply(titleScaleAnim, titlePulseAnim) }],
            }}
          >
            <Text style={styles.brandTitleShadow}>Best Cream</Text>
            <Text style={styles.brandTitle}>Best Cream</Text>
          </Animated.View>
        </View>

        {/* Lower Third: Loading Bar + Official Badges */}
        <Animated.View
          className="w-full max-w-[290px] items-center pb-6"
          style={{ opacity: bottomFadeAnim }}
        >
          <View className="w-full h-1.5 rounded-full bg-white border border-[#EFE3D5] overflow-hidden shadow-sm mb-6">
            <Animated.View
              className="h-full bg-strawberryPink rounded-full"
              style={{ width: progressWidth }}
            />
          </View>

          <PaymentBadges />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  iconComposition: { alignItems: 'center', marginTop: -4 },
  cherry: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D90429',
    position: 'relative',
    marginBottom: -4,
    zIndex: 5,
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
  scoopStrawberry: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF85A1' },
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
  starAccentLeft: { position: 'absolute', left: 14, top: 24, fontSize: 11, color: '#FFD166' },
  starAccentRight: { position: 'absolute', right: 14, top: 24, fontSize: 11, color: '#FFD166' },
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
    color: '#2D1B17',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
});
