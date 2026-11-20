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

/** Restrict imports from a backend layer folder (regex so relative paths like ../repositories/x.js match). */
const layer = (name, allowTypeImports = false) => ({
  regex: `(^|/)${name}(/|$)`,
  ...(allowTypeImports ? { allowTypeImports: true } : {}),
  message: `This layer must not import from ${name}/.`,
});
const apiLayer = (dir, why, patterns) => ({
  files: [`apps/api/src/${dir}/**/*.ts`],
  rules: {
    'no-restricted-imports': ['error', { patterns: patterns.map((p) => ({ ...p, message: `${p.message} ${why}` })) }],
  },
});

const WEB_RESTRICTED_PATHS = [
  { name: 'axios', message: 'Use @carbon-glint/sdk.' },
  { name: 'ky', message: 'Use @carbon-glint/sdk.' },
];
const WEB_RESTRICTED_PATTERNS = [
  { group: ['@carbon-glint/sdk/*'], message: 'Import from @carbon-glint/sdk only.' },
  { group: ['@carbon-glint/api-spec', '@carbon-glint/api-spec/*'], message: 'Use types from @carbon-glint/sdk.' },
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
  // Layering: controller → service → repository → model. Each layer may only reach downwards.
  apiLayer('controllers', 'Controllers only call services and set status codes.', [
    layer('repositories'),
    layer('models'),
    layer('db'),
    { regex: '^(drizzle-orm|pg|@google/genai)(/|$)', message: 'No data/AI access in controllers.' },
    { regex: '(^|/)lib/gemini', message: 'No AI access in controllers.' },
  ]),
  apiLayer('services', 'Services hold business logic over repositories; no HTTP or SQL.', [
    layer('controllers'),
    layer('models', true),
    layer('db'),
    { regex: '^(express|drizzle-orm|pg|@google/genai)(/|$)', message: 'Use repositories / deps.ai instead.' },
  ]),
  apiLayer('repositories', 'Repositories only read/write models; no DTOs, HTTP or business rules.', [
    layer('controllers'),
    layer('services'),
    layer('errors'),
    { regex: '^(express|@carbon-glint/api-spec|@google/genai)(/|$)', message: 'Repositories deal in models only.' },
  ]),
  apiLayer('models', 'Models are Drizzle table definitions only.', [
    layer('controllers'),
    layer('services'),
    layer('repositories'),
    { regex: '^(express|@carbon-glint/api-spec|pg)(/|$)', message: 'Models only use drizzle-orm/pg-core.' },
  ]),

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
      'no-restricted-imports': ['error', { paths: WEB_RESTRICTED_PATHS, patterns: WEB_RESTRICTED_PATTERNS }],
    },
  },
  {
    // Containers: state + SDK calls only. They render exactly one component and no markup.
    files: ['apps/web/src/containers/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: WEB_RESTRICTED_PATHS,
          patterns: [
            ...WEB_RESTRICTED_PATTERNS,
            { group: ['@mui/*', '@emotion/*'], message: 'Containers render no UI. Put MUI markup in a component.' },
          ],
        },
      ],
    },
  },
  {
    // Components: props + conditional rendering only (MUI for all UI).
    files: ['apps/web/src/components/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...WEB_RESTRICTED_PATHS,
            {
              name: '@carbon-glint/sdk',
              allowTypeImports: true,
              message: 'Components may only import SDK *types*. Make API calls in a container.',
            },
            { name: '@mui/material', message: "Use path imports, e.g. import Button from '@mui/material/Button'." },
            {
              name: 'react',
              importNames: STATEFUL_REACT_APIS,
              message: 'Components are stateless. Move state/effects into a container.',
            },
          ],
          patterns: [
            ...WEB_RESTRICTED_PATTERNS,
            { group: ['**/containers/**'], message: 'Components must not depend on containers.' },
            { group: ['@tanstack/*'], message: 'Data fetching belongs in containers.' },
          ],
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
