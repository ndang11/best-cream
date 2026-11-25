// NativeWind v4 styling bridge
// Replaces twrnc with NativeWind-compatible style resolver and CSS interop helper.
// Allows both className usage and legacy tw`...` template literal style resolution.

export type StyleInput = string | Array<string | object | boolean | null | undefined> | TemplateStringsArray;

export interface TwFn {
  (strings: TemplateStringsArray, ...values: any[]): any;
  (...classes: any[]): any;
  style: (...classes: any[]) => any;
  color: (colorName: string) => string | undefined;
}

// Brand color palette extracted from tailwind.config.js for programmatic color access
export const BRAND_COLORS: Record<string, string> = {
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
};

// Common Tailwind utility mapping to React Native style object properties
function parseUtility(className: string): Record<string, any> | null {
  const c = className.trim();
  if (!c) return null;

  // Exact brand colors
  if (c === 'bg-pageBg') return { backgroundColor: BRAND_COLORS.pageBg };
  if (c === 'bg-surfaceBright') return { backgroundColor: BRAND_COLORS.surfaceBright };
  if (c === 'bg-borderSubtle') return { backgroundColor: BRAND_COLORS.borderSubtle };
  if (c === 'bg-vanillaCream') return { backgroundColor: BRAND_COLORS.vanillaCream };
  if (c === 'bg-vanillaCreamDark') return { backgroundColor: BRAND_COLORS.vanillaCreamDark };
  if (c === 'bg-strawberryPink') return { backgroundColor: BRAND_COLORS.strawberryPink };
  if (c === 'bg-strawberryPinkDark') return { backgroundColor: BRAND_COLORS.strawberryPinkDark };
  if (c === 'bg-strawberryPinkLight') return { backgroundColor: BRAND_COLORS.strawberryPinkLight };
  if (c === 'bg-chocolateBrown') return { backgroundColor: BRAND_COLORS.chocolateBrown };
  if (c === 'bg-chocolateBrownLight') return { backgroundColor: BRAND_COLORS.chocolateBrownLight };
  if (c === 'bg-chocolateBrownMuted') return { backgroundColor: BRAND_COLORS.chocolateBrownMuted };
  if (c === 'bg-butterYellow') return { backgroundColor: BRAND_COLORS.butterYellow };
  if (c === 'bg-butterYellowLight') return { backgroundColor: BRAND_COLORS.butterYellowLight };
  if (c === 'bg-pistachioGreen') return { backgroundColor: BRAND_COLORS.pistachioGreen };
  if (c === 'bg-pistachioGreenLight') return { backgroundColor: BRAND_COLORS.pistachioGreenLight };
  if (c === 'bg-errorRed') return { backgroundColor: BRAND_COLORS.errorRed };
  if (c === 'bg-errorRedLight') return { backgroundColor: BRAND_COLORS.errorRedLight };
  if (c === 'bg-errorRedBorder') return { backgroundColor: BRAND_COLORS.errorRedBorder };
  if (c === 'bg-outOfStockBg') return { backgroundColor: BRAND_COLORS.outOfStockBg };

  // Text colors
  if (c === 'text-pageBg') return { color: BRAND_COLORS.pageBg };
  if (c === 'text-surfaceBright') return { color: BRAND_COLORS.surfaceBright };
  if (c === 'text-borderSubtle') return { color: BRAND_COLORS.borderSubtle };
  if (c === 'text-vanillaCream') return { color: BRAND_COLORS.vanillaCream };
  if (c === 'text-vanillaCreamDark') return { color: BRAND_COLORS.vanillaCreamDark };
  if (c === 'text-strawberryPink') return { color: BRAND_COLORS.strawberryPink };
  if (c === 'text-strawberryPinkDark') return { color: BRAND_COLORS.strawberryPinkDark };
  if (c === 'text-strawberryPinkLight') return { color: BRAND_COLORS.strawberryPinkLight };
  if (c === 'text-chocolateBrown') return { color: BRAND_COLORS.chocolateBrown };
  if (c === 'text-chocolateBrownLight') return { color: BRAND_COLORS.chocolateBrownLight };
  if (c === 'text-chocolateBrownMuted') return { color: BRAND_COLORS.chocolateBrownMuted };
  if (c === 'text-butterYellow') return { color: BRAND_COLORS.butterYellow };
  if (c === 'text-butterYellowLight') return { color: BRAND_COLORS.butterYellowLight };
  if (c === 'text-pistachioGreen') return { color: BRAND_COLORS.pistachioGreen };
  if (c === 'text-pistachioGreenLight') return { color: BRAND_COLORS.pistachioGreenLight };
  if (c === 'text-errorRed') return { color: BRAND_COLORS.errorRed };
  if (c === 'text-white') return { color: '#ffffff' };
  if (c === 'text-black') return { color: '#000000' };

  // Border colors
  if (c === 'border-borderSubtle') return { borderColor: BRAND_COLORS.borderSubtle };
  if (c === 'border-strawberryPink') return { borderColor: BRAND_COLORS.strawberryPink };
  if (c === 'border-chocolateBrown') return { borderColor: BRAND_COLORS.chocolateBrown };
  if (c === 'border-butterYellow') return { borderColor: BRAND_COLORS.butterYellow };
  if (c === 'border-pistachioGreen') return { borderColor: BRAND_COLORS.pistachioGreen };

  // Hex bg or text
  if (c.startsWith('bg-[') && c.endsWith(']')) {
    return { backgroundColor: c.slice(4, -1) };
  }
  if (c.startsWith('text-[') && c.endsWith(']')) {
    const val = c.slice(6, -1);
    if (val.startsWith('#') || val.startsWith('rgb')) return { color: val };
    if (val.endsWith('px')) return { fontSize: parseFloat(val) };
  }

  // Flex
  if (c === 'flex-1') return { flex: 1 };
  if (c === 'flex-row') return { flexDirection: 'row' };
  if (c === 'flex-col') return { flexDirection: 'column' };
  if (c === 'flex-wrap') return { flexWrap: 'wrap' };
  if (c === 'items-center') return { alignItems: 'center' };
  if (c === 'items-start') return { alignItems: 'flex-start' };
  if (c === 'items-end') return { alignItems: 'flex-end' };
  if (c === 'justify-center') return { justifyContent: 'center' };
  if (c === 'justify-between') return { justifyContent: 'space-between' };
  if (c === 'justify-around') return { justifyContent: 'space-around' };
  if (c === 'justify-start') return { justifyContent: 'flex-start' };
  if (c === 'justify-end') return { justifyContent: 'flex-end' };

  return null;
}

// Internal cache for resolved utility styles
const styleCache: Record<string, any> = {};

function resolveClassString(str: string): any {
  if (!str) return {};
  if (styleCache[str]) return styleCache[str];

  const classes = str.trim().split(/\s+/);
  const result: Record<string, any> = {};

  for (const item of classes) {
    const parsed = parseUtility(item);
    if (parsed) {
      Object.assign(result, parsed);
    }
  }

  styleCache[str] = result;
  return result;
}

export function buildTw(): TwFn {
  const handler: any = function (first: any, ...rest: any[]) {
    // Tagged template call: tw`flex-1 bg-white`
    if (Array.isArray(first) && 'raw' in first) {
      let combined = '';
      for (let i = 0; i < first.length; i++) {
        combined += first[i];
        if (i < rest.length && rest[i] != null) {
          combined += String(rest[i]);
        }
      }
      return resolveClassString(combined);
    }

    // Function call with style objects or class strings: tw('flex-1', { marginTop: 10 })
    const merged: Record<string, any> = {};
    const args = [first, ...rest];
    for (const arg of args) {
      if (!arg) continue;
      if (typeof arg === 'string') {
        Object.assign(merged, resolveClassString(arg));
      } else if (typeof arg === 'object') {
        Object.assign(merged, arg);
      }
    }
    return merged;
  };

  handler.style = (...classes: any[]) => handler(...classes);
  handler.color = (colorName: string) => BRAND_COLORS[colorName];

  return handler as TwFn;
}

export const tw = buildTw();
export default tw;
