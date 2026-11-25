import React from 'react';
import { View, type ViewProps } from 'react-native';

export interface AppCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'soft' | 'cream';
  className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<AppCardProps['variant']>, string> = {
  default: 'bg-white rounded-3xl border border-borderSubtle p-5 shadow-sm',
  elevated: 'bg-white rounded-3xl border border-borderSubtle p-6 shadow-md',
  soft: 'bg-surfaceBright rounded-2xl border border-borderSubtle p-4',
  cream: 'bg-vanillaCream rounded-3xl border border-vanillaCreamDark p-5 shadow-sm',
};

export function AppCard({
  variant = 'default',
  className = '',
  children,
  ...props
}: AppCardProps) {
  return (
    <View className={`${VARIANT_CLASSES[variant]} ${className}`} {...props}>
      {children}
    </View>
  );
}

