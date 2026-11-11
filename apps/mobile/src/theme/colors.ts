export const COLORS = {
  // Core Brand Colors
  vanillaCream: '#FFFDF0',        // App background & bottom navigation
  vanillaCreamDark: '#F7F2DE',    // Slightly deeper vanilla for borders/accents
  strawberryPink: '#FF6584',      // Primary buttons & selected nav icon
  strawberryPinkDark: '#E84E6E',  // Pressed state
  strawberryPinkLight: '#FFEBF0', // Subtle pink pill/badge backgrounds
  chocolateBrown: '#3E2723',      // Headings, button text, price labels
  chocolateBrownLight: '#6D4C41', // Secondary text & subtitles
  chocolateBrownMuted: '#9E857E', // Hint text & subtle borders
  white: '#FFFFFF',               // Product cards
  butterYellow: '#FFD166',        // Special offers badge
  butterYellowLight: '#FFF6D9',   // Warm butter background
  pistachioGreen: '#70C184',      // Available stock indicator
  pistachioGreenLight: '#EAF7EE', // Stock badge background

  // System & Shadows
  cardShadow: 'rgba(62, 39, 35, 0.08)',
  glowShadow: 'rgba(255, 101, 132, 0.25)',

  // Validation / System states
  errorRed: '#E53935',          // Input validation error
  errorRedLight: '#FFF5F5',     // Error input background
  errorRedBorder: '#FFAAA6',    // Error border (softer)
  outOfStockBg: '#FFEAEA',      // Out-of-stock badge background
  outOfStockText: '#D32F2F',    // Out-of-stock text color
} as const;

export type ColorKey = keyof typeof COLORS;

