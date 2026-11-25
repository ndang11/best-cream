import React from 'react';
import { View, Text } from 'react-native';

export type BadgeTone = 'pink' | 'success' | 'warning' | 'error' | 'brown' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  showDot?: boolean;
  className?: string;
}

const TONE_BOX: Record<BadgeTone, string> = {
  pink: 'bg-strawberryPinkLight border-strawberryPink/30',
  success: 'bg-pistachioGreenLight border-pistachioGreen/40',
  warning: 'bg-butterYellowLight border-butterYellow',
  error: 'bg-outOfStockBg border-errorRedBorder',
  brown: 'bg-chocolateBrown border-chocolateBrown',
  neutral: 'bg-surfaceBright border-borderSubtle',
};

const TONE_TEXT: Record<BadgeTone, string> = {
  pink: 'text-strawberryPinkDark',
  success: 'text-emerald-800',
  warning: 'text-amber-900',
  error: 'text-errorRed',
  brown: 'text-white',
  neutral: 'text-chocolateBrownLight',
};

const TONE_DOT: Record<BadgeTone, string> = {
  pink: 'bg-strawberryPink',
  success: 'bg-pistachioGreen',
  warning: 'bg-butterYellow',
  error: 'bg-errorRed',
  brown: 'bg-butterYellow',
  neutral: 'bg-chocolateBrownMuted',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  showDot = false,
  className = '',
}: StatusBadgeProps) {
  return (
    <View
      className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border self-start ${TONE_BOX[tone]} ${className}`}
    >
      {showDot ? <View className={`w-2 h-2 rounded-full ${TONE_DOT[tone]}`} /> : null}
      <Text className={`text-[11px] font-extrabold ${TONE_TEXT[tone]}`}>
        {label}
      </Text>
    </View>
  );
}

