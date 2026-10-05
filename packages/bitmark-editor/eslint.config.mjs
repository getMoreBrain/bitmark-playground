// @gmb/bitmark-editor lint config: self-contained, so the package lifts out
// unchanged (PLAN-020 D6).
import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist', 'spikes', 'playground-spike', 'examples', 'node_modules', 'scripts'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['src/**/*.{ts,tsx}'] })),
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { prettier, 'simple-import-sort': simpleImportSort },
    languageOptions: { parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: import.meta.dirname } },
    rules: {
      'no-undef': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'prettier/prettier': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // The core must stay framework-free and receive Monaco by injection
      // (PLAN-020 D6, D8).
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'monaco-editor',
              message: 'The core receives Monaco by injection (PLAN-020 D8); import types only.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['react', 'react-*', 'valtio', 'valtio/*', 'theme-ui', 'lodash', 'lodash/*'],
              message: 'The core is framework-free (PLAN-020 D6).',
            },
            {
              group: ['monaco-editor/*'],
              message: 'The core receives Monaco by injection (PLAN-020 D8); import types only.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // The React adapter is the one place React is allowed (PLAN-020 D3).
  {
    files: ['src/react/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { paths: [{ name: 'monaco-editor', allowTypeImports: true, message: 'Types only (PLAN-020 D8).' }] },
      ],
    },
  },
];
