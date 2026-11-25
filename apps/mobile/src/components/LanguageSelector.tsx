import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

interface LanguageSelectorProps {
  style?: ViewStyle;
  className?: string;
}

export default function LanguageSelector({ style, className = '' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <View
      style={style}
      className={`flex-row items-center bg-white/95 p-1 rounded-full border border-vanillaCreamDark shadow-sm ${className}`}
    >
      <TouchableOpacity
        className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${
          language === 'en' ? 'bg-strawberryPink shadow-sm' : 'bg-transparent'
        }`}
        onPress={() => setLanguage('en')}
        activeOpacity={0.75}
      >
        <Text className="text-xs">🇬🇧</Text>
        <Text
          className={`text-[11px] font-black ${
            language === 'en' ? 'text-white' : 'text-chocolateBrownMuted'
          }`}
        >
          EN
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${
          language === 'fr' ? 'bg-strawberryPink shadow-sm' : 'bg-transparent'
        }`}
        onPress={() => setLanguage('fr')}
        activeOpacity={0.75}
      >
        <Text className="text-xs">🇫🇷</Text>
        <Text
          className={`text-[11px] font-black ${
            language === 'fr' ? 'text-white' : 'text-chocolateBrownMuted'
          }`}
        >
          FR
        </Text>
      </TouchableOpacity>
    </View>
  );
}
