import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const codeFiles = ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts,vue}']
const tsFiles = ['**/*.{ts,tsx,cts,mts}']

const sharedRules = {
  'no-console': 'off',
  'no-debugger': 'error',
  'vue/multi-word-component-names': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }
  ]
}

export default defineConfig([
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**']
  },
  {
    files: codeFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
        ...globals.vitest
      }
    }
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,jsx,cjs,mjs}']
  },
  ...vuePlugin.configs['flat/essential'],
  {
    files: tsFiles,
    languageOptions: {
      parser: tsParser
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...sharedRules
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        extraFileExtensions: ['.vue'],
        parser: tsParser,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: sharedRules
  },
  {
    files: ['**/*.{js,jsx,cjs,mjs}'],
    rules: {
      'no-console': 'off',
      'no-debugger': 'error'
    }
  }
])
