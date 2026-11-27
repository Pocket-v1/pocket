import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist', 'dist-inline', 'node_modules', 'supabase/functions',
      // Legacy modules kept for reference; nothing in the app imports them.
      'src/features/FeatureComponents.jsx', 'src/features/pages/FinancePages.jsx', 'src/features/admin/AccessAndVehicles.jsx',
      'src/features/modals/FinanceModals.jsx', 'src/features/auth/AccountAndSettings.jsx',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      // Catches the ReferenceError class of bug (a component or helper used but never imported).
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Style-only findings in existing code: reported, but they do not fail CI.
      'no-constant-binary-expression': 'warn',
      'no-unreachable': 'warn',
    },
  },
];
