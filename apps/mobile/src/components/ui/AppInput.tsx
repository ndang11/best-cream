import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export interface AppInputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  touched?: boolean;
  isValid?: boolean;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  containerClassName?: string;
}

export function AppInput({
  label,
  icon,
  error,
  touched,
  isValid,
  isPassword,
  showPassword,
  onTogglePassword,
  containerClassName = '',
  ...inputProps
}: AppInputProps) {
  const hasError = Boolean(touched && error);
  const validState = Boolean(!hasError && isValid);

  const boxStateClass = hasError
    ? 'bg-errorRedLight border-errorRedBorder'
    : validState
      ? 'bg-white border-pistachioGreen'
      : 'bg-pageBg/60 border-borderSubtle';

  const iconColor = hasError
    ? COLORS.errorRed
    : validState
      ? COLORS.pistachioGreen
      : COLORS.chocolateBrownMuted;

  return (
    <View className={`mb-3.5 ${containerClassName}`}>
      {label ? (
        <Text className="text-xs font-extrabold text-chocolateBrown mb-1.5 ml-0.5">
          {label}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center rounded-2xl px-3.5 py-3 border ${boxStateClass}`}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={iconColor}
            style={{ marginRight: 10 }}
          />
        ) : null}

        <TextInput
          className="flex-1 text-sm font-semibold text-chocolateBrown p-0"
          placeholderTextColor={COLORS.chocolateBrownMuted}
          secureTextEntry={isPassword ? !showPassword : inputProps.secureTextEntry}
          {...inputProps}
        />

        {validState && !isPassword ? (
          <Ionicons name="checkmark-circle" size={17} color={COLORS.pistachioGreen} />
        ) : null}

        {isPassword && onTogglePassword ? (
          <Pressable onPress={onTogglePassword} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={COLORS.chocolateBrownMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <View className="flex-row items-center gap-1 mt-1.5 ml-0.5">
          <Ionicons name="alert-circle" size={13} color={COLORS.errorRed} />
          <Text className="text-xs font-bold text-errorRed flex-1">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

