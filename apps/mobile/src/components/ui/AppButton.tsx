import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'butter';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
  textClassName?: string;
}

const CONTAINER_VARIANTS: Record<AppButtonVariant, string> = {
  primary: 'bg-strawberryPink active:bg-strawberryPinkDark shadow-md',
  secondary: 'bg-chocolateBrown shadow-md',
  outline: 'bg-transparent border-2 border-strawberryPink',
  ghost: 'bg-surfaceBright border border-borderSubtle',
  butter: 'bg-butterYellow shadow-sm',
};

const TEXT_VARIANTS: Record<AppButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-strawberryPink',
  ghost: 'text-chocolateBrown',
  butter: 'text-chocolateBrown',
};

const SIZE_CLASSES: Record<AppButtonSize, string> = {
  sm: 'py-2.5 px-4 rounded-xl',
  md: 'py-3.5 px-5 rounded-2xl',
  lg: 'py-4 px-6 rounded-2xl',
};

const TEXT_SIZE_CLASSES: Record<AppButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function AppButton({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  className = '',
  textClassName = '',
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const iconColor =
    variant === 'primary' || variant === 'secondary'
      ? COLORS.white
      : variant === 'outline'
        ? COLORS.strawberryPink
        : COLORS.chocolateBrown;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 ${SIZE_CLASSES[size]} ${CONTAINER_VARIANTS[variant]} ${isDisabled ? 'opacity-60' : ''
        } ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={iconColor} />
      ) : null}
      <Text
        className={`font-extrabold tracking-wide ${TEXT_SIZE_CLASSES[size]} ${TEXT_VARIANTS[variant]} ${textClassName}`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

