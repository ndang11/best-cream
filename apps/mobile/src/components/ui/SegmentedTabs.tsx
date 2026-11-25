import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export interface SegmentedTabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  scrollable?: boolean;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  activeKey,
  onChange,
  scrollable = false,
  className = '',
}: SegmentedTabsProps<T>) {
  const content = tabs.map((tab) => {
    const active = tab.key === activeKey;
    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onChange(tab.key)}
        activeOpacity={0.8}
        className={`${
          scrollable ? 'px-3.5 mr-1.5' : 'flex-1'
        } py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
          active ? 'bg-chocolateBrown shadow-sm' : 'bg-transparent'
        }`}
      >
        {tab.icon ? (
          <Ionicons
            name={tab.icon}
            size={14}
            color={active ? COLORS.white : COLORS.chocolateBrownLight}
          />
        ) : null}
        <Text
          numberOfLines={1}
          className={`text-xs font-extrabold ${
            active ? 'text-white' : 'text-chocolateBrownLight'
          }`}
        >
          {tab.label}
        </Text>
        {typeof tab.count === 'number' ? (
          <View
            className={`px-1.5 py-0.5 rounded-full ${
              active ? 'bg-strawberryPink' : 'bg-borderSubtle'
            }`}
          >
            <Text
              className={`text-[10px] font-black ${
                active ? 'text-white' : 'text-chocolateBrown'
              }`}
            >
              {tab.count}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={`bg-surfaceBright p-1 rounded-2xl border border-borderSubtle ${className}`}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View
      className={`flex-row bg-surfaceBright p-1 rounded-2xl border border-borderSubtle ${className}`}
    >
      {content}
    </View>
  );
}

