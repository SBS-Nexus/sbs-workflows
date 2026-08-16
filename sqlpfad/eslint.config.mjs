import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Flat Config für ESLint 9.
 *
 * `eslint-config-next` liefert seit Next 16 direkt eine Flat Config; der Umweg
 * über FlatCompat entfällt deshalb.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/generated/**',
      'public/pyodide/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextCoreWebVitals,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    // jsx-a11y ist bereits über eslint-config-next registriert; hier werden nur
    // die vollständigen Empfehlungen zusätzlich aktiviert.
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // Die Formularelemente umschließen ihre Eingabe und enthalten Titel und
      // Erläuterung in verschachtelten Elementen. Die Standardtiefe von 2
      // reicht dafür nicht aus.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 4, assert: 'either' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'prisma/**/*.ts', 'vitest.config.ts', 'playwright.config.ts'],
    rules: { 'no-console': 'off' },
  },
);
