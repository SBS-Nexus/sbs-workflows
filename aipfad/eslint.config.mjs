import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Flat Config für ESLint 9. Übernommen aus pythonpfad/sqlpfad – dieselbe
 * Konfiguration soll in allen drei Geschwisterprojekten gelten.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/generated/**',
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
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
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
