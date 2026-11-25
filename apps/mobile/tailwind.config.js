/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        pageBg: '#FFF0F3',
        surfaceBright: '#FFF9FA',
        borderSubtle: '#FFE2E6',
        vanillaCream: '#FFFDF0',
        vanillaCreamDark: '#F7F2DE',
        strawberryPink: '#FF6584',
        strawberryPinkDark: '#E84E6E',
        strawberryPinkLight: '#FFEBF0',
        chocolateBrown: '#3E2723',
        chocolateBrownLight: '#6D4C41',
        chocolateBrownMuted: '#9E857E',
        butterYellow: '#FFD166',
        butterYellowLight: '#FFF6D9',
        pistachioGreen: '#70C184',
        pistachioGreenLight: '#EAF7EE',
        errorRed: '#E53935',
        errorRedLight: '#FFF5F5',
        errorRedBorder: '#FFAAA6',
        outOfStockBg: '#FFEAEA',
      },
    },
  },
  plugins: [],
};
