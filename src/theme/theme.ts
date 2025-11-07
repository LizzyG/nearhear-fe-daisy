import palette from './colors.json';

export type ThemePalette = typeof palette;

export const brandColors = {
  primary: palette.primary,
  secondary: palette.secondary,
  accent: palette.accent,
};

export const surfaceColors = {
  base: {
    100: palette.base100,
    200: palette.base200,
    300: palette.base300,
  },
  neutral: palette.neutral,
};

export const stateColors = {
  info: palette.info,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
};

export const contentColors = {
  onPrimary: palette.primaryContent,
  onSecondary: palette.secondaryContent,
  onAccent: palette.accentContent,
  onNeutral: palette.neutralContent,
};

export const themeTokens = {
  brand: brandColors,
  surface: surfaceColors,
  state: stateColors,
  content: contentColors,
} as const;

export const daisyTheme = {
  primary: palette.primary,
  'primary-content': palette.primaryContent,
  secondary: palette.secondary,
  'secondary-content': palette.secondaryContent,
  accent: palette.accent,
  'accent-content': palette.accentContent,
  neutral: palette.neutral,
  'neutral-content': palette.neutralContent,
  'base-100': palette.base100,
  'base-200': palette.base200,
  'base-300': palette.base300,
  info: palette.info,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
} as const;

export type DaisyTheme = typeof daisyTheme;
