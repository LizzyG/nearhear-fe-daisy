import daisyui from 'daisyui';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          '"Nunito"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    logs: false,
    darkTheme: 'elzie',
    themes: [
      'synthwave',
      {
        nearhear: {
          'color-scheme': 'light',
          'base-100': 'oklch(100% 0 0)',
          'base-200': 'oklch(98% 0 0)',
          'base-300': 'oklch(95% 0 0)',
          'base-content': 'oklch(21% 0.006 285.885)',
          primary: 'rgb(66 42 213)',
          'primary-content': 'oklch(93% 0.034 272.788)',
          secondary: 'oklch(65% 0.241 354.308)',
          'secondary-content': 'oklch(94% 0.028 342.258)',
          accent: 'oklch(77% 0.152 181.912)',
          'accent-content': 'oklch(38% 0.063 188.416)',
          neutral: 'oklch(14% 0.005 285.823)',
          'neutral-content': 'oklch(92% 0.004 286.32)',
          info: 'oklch(74% 0.16 232.661)',
          'info-content': 'oklch(29% 0.066 243.157)',
          success: 'oklch(76% 0.177 163.223)',
          'success-content': 'oklch(37% 0.077 168.94)',
          warning: 'oklch(82% 0.189 84.429)',
          'warning-content': 'oklch(41% 0.112 45.904)',
          error: 'oklch(71% 0.194 13.428)',
          'error-content': 'oklch(27% 0.105 12.094)',
        },
      },
      {
        elzie: {
          'color-scheme': 'dark',
          'base-100': '#002529',
          'base-200': '#004B52',
          'base-300': '#00838F',
          'base-content': '#00A8B8',
          primary: '#00e3f6',
          'primary-content': 'oklch(93% 0.034 272.788)',
          secondary: '#ff7200',
          'secondary-content': 'oklch(94% 0.028 342.258)',
          accent: 'oklch(62% 0.265 303.9)',
          'accent-content': 'oklch(38% 0.063 188.416)',
          neutral: 'oklch(14% 0.005 285.823)',
          'neutral-content': 'oklch(92% 0.004 286.32)',
          info: 'oklch(74% 0.16 232.661)',
          'info-content': 'oklch(29% 0.066 243.157)',
          success: 'oklch(76% 0.177 163.223)',
          'success-content': 'oklch(37% 0.077 168.94)',
          warning: 'oklch(82% 0.189 84.429)',
          'warning-content': 'oklch(41% 0.112 45.904)',
          error: 'oklch(58% 0.253 17.585)',
          'error-content': 'oklch(27% 0.105 12.094)',
        },
      },
    ],
  },
};

export default config;


