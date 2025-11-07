/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
/** @type {import('tailwindcss').Config} */
const palette = require('./src/theme/colors.json');

const daisyTheme = {
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
};

module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: palette.primary,
          secondary: palette.secondary,
          accent: palette.accent,
        },
        surface: {
          base100: palette.base100,
          base200: palette.base200,
          base300: palette.base300,
          neutral: palette.neutral,
        },
        state: {
          info: palette.info,
          success: palette.success,
          warning: palette.warning,
          error: palette.error,
        },
        content: {
          onPrimary: palette.primaryContent,
          onSecondary: palette.secondaryContent,
          onAccent: palette.accentContent,
          onNeutral: palette.neutralContent,
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        nearhear: daisyTheme,
      },
    ],
    darkTheme: 'nearhear',
  },
};
