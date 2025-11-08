import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig, vueTsConfigs } from '@vue/eslint-config-typescript';
import vuePrettier from '@vue/eslint-config-prettier';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  {
    ignores: [
      'dist',
      'node_modules',
      'tailwind.config.ts',
      'postcss.config.js',
      'prettier.config.js',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  vuePrettier,
  {
    files: ['src/**/*.{ts,tsx,js,jsx,vue}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
    },
  },
  {
    files: [
      '*.{config,turbo}.{js,ts}',
      '*.config.{js,ts,mjs,cjs}',
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'prettier.config.js',
    ],
    languageOptions: {
      parserOptions: {
        project: null,
        tsconfigRootDir,
      },
    },
  },
);
