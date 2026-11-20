import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const STATEFUL_REACT_APIS = [
  'useState',
  'useReducer',
  'useEffect',
  'useLayoutEffect',
  'useSyncExternalStore',
  'useTransition',
  'useActionState',
  'useOptimistic',
];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/generated/**', '**/coverage/**', 'apps/api/drizzle/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ── Backend ────────────────────────────────────────────────────────────────
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // ── Frontend ───────────────────────────────────────────────────────────────
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // The generated SDK is the only API client.
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use @carbon-glint/sdk instead of fetch.' }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: 'Use @carbon-glint/sdk.' },
            { name: 'ky', message: 'Use @carbon-glint/sdk.' },
          ],
          patterns: [
            { group: ['@carbon-glint/sdk/*'], message: 'Import from @carbon-glint/sdk only.' },
            {
              group: ['@carbon-glint/api-spec', '@carbon-glint/api-spec/*'],
              message: 'Use types from @carbon-glint/sdk.',
            },
          ],
        },
      ],
    },
  },
  {
    // Components: props + conditional rendering only.
    files: ['apps/web/src/components/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@carbon-glint/sdk',
              allowTypeImports: true,
              message: 'Components may only import SDK *types*. Make API calls in a container.',
            },
            {
              name: 'react',
              importNames: STATEFUL_REACT_APIS,
              message: 'Components are stateless. Move state/effects into a container.',
            },
          ],
          patterns: [{ group: ['**/containers/**'], message: 'Components must not depend on containers.' }],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `MemberExpression[object.name='React'][property.name=/^(${STATEFUL_REACT_APIS.join('|')})$/]`,
          message: 'Components are stateless. Move state/effects into a container.',
        },
      ],
    },
  },
);
