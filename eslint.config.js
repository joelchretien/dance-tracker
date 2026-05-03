import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import globals from 'globals'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      'public/sw.js',  // SW is plain JS, not part of TS app
      'scripts/**',    // converter scripts have their own conventions
    ],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Match the style the codebase already uses everywhere.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Vue templates use kebab-case attributes that conflict with this rule.
      'vue/multi-word-component-names': 'off',
      // Single-line attributes per element keep the diff readable; allow.
      'vue/max-attributes-per-line': 'off',
      // `any` is sometimes the pragmatic choice for narrow casts at boundaries.
      // The codebase uses `as unknown as { ... }` patterns intentionally.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Test files use a few patterns we don't want to flag in app code.
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Tests deliberately pass invalid types to exercise validators.
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  // Vite/Node config files use Node globals.
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // public/sw.js uses service worker globals (self, caches, etc).
  {
    files: ['public/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
]
