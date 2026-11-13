import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { tw } from '../theme/tailwind';
import { COLORS } from '../theme/colors';

interface LanguageSelectorProps {
  style?: ViewStyle;
}

export default function LanguageSelector({ style }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <View
      style={[
        tw`flex-row items-center bg-white/90 p-1 rounded-full border border-vanillaCreamDark shadow-sm`,
        style,
      ]}
    >
      {/* English Option */}
      <TouchableOpacity
        style={[
          tw`flex-row items-center gap-1 px-2.5 py-1 rounded-full`,
          language === 'en'
            ? tw`bg-strawberryPink shadow-sm`
            : tw`bg-transparent`,
        ]}
        onPress={() => setLanguage('en')}
        activeOpacity={0.7}
      >
        <Text style={tw`text-xs`}>🇬🇧</Text>
        <Text
          style={[
            tw`text-[11px] font-black`,
            language === 'en' ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>

      {/* French Option */}
      <TouchableOpacity
        style={[
          tw`flex-row items-center gap-1 px-2.5 py-1 rounded-full`,
          language === 'fr'
            ? tw`bg-strawberryPink shadow-sm`
            : tw`bg-transparent`,
        ]}
        onPress={() => setLanguage('fr')}
        activeOpacity={0.7}
      >
        <Text style={tw`text-xs`}>🇫🇷</Text>
        <Text
          style={[
            tw`text-[11px] font-black`,
            language === 'fr' ? tw`text-chocolateBrown` : tw`text-chocolateBrownMuted`,
          ]}
        >
          FR
        </Text>
      </TouchableOpacity>
    </View>
  );
}

