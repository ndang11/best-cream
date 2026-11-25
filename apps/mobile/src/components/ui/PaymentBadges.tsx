import React from 'react';
import { View, Text } from 'react-native';

export interface PaymentBadgesProps {
  compact?: boolean;
  className?: string;
}

export function PaymentBadges({ compact = false, className = '' }: PaymentBadgesProps) {
  return (
    <View className={`flex-row items-center justify-center gap-3 ${className}`}>
      {/* MTN MoMo Badge */}
      <View
        className={`bg-[#FFCC00] border border-[#E6B800] rounded-xl flex-row items-center gap-1.5 shadow-sm ${
          compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
        }`}
      >
        <View className="bg-[#004F71] rounded-full px-2 py-0.5 items-center justify-center">
          <Text className="text-[11px] font-black text-[#FFCC00] tracking-tight">
            MoMo
          </Text>
        </View>
        <Text className="text-[11px] font-black text-[#002B49] tracking-wide">
          MTN
        </Text>
      </View>

      {/* Orange Money Badge */}
      <View
        className={`bg-[#1E1E1E] border border-[#333333] rounded-xl flex-row items-center gap-1.5 shadow-sm ${
          compact ? 'px-2.5 py-1' : 'px-3 py-1.5'
        }`}
      >
        <View className="w-4 h-4 rounded bg-[#FF7900] items-center justify-center">
          <View className="w-1.5 h-1.5 rounded-[1px] bg-white" />
        </View>
        <View className="flex-row items-baseline gap-0.5">
          <Text className="text-[11px] font-bold text-white">orange</Text>
          <Text className="text-[11px] font-black text-[#FF7900]">money</Text>
        </View>
      </View>
    </View>
  );
}

