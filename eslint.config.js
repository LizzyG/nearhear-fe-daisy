import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig, vueTsConfigs } from '@vue/eslint-config-typescript';
import vuePrettier from '@vue/eslint-config-prettier';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  vuePrettier,
  {
    files: ['**/*.{ts,tsx,js,jsx,vue}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
    },
  },
);
