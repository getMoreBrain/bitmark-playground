import js from '@eslint/js';
// import json from '@eslint/json';
import markdown from '@eslint/markdown';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
// import fs from 'fs-extra';
// import globals from 'globals';
// import stringify from 'safe-stable-stringify';
import tseslint from 'typescript-eslint';

/** @type {import("eslint").Linter.Config[]} */
const config = [
  //
  // General ESLint configuration
  //
  {
    ignores: [
      '**/package-lock.json',
      '**/node_modules',
      '**/dist',
      '**/docs',
      '**/coverage',
      '**/build',
      'assets',
      'specs',
      'plans',
      '.github',
      '.zen',
      'src/generated',
      '**/*.d.ts',
    ],
  },

  //
  // TypeScript files
  //
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      prettier,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'prettier/prettier': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          caughtErrors: 'all',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_', // Ignore variables that start with "_"
          argsIgnorePattern: '^_', // Ignore function arguments that start with "_"
          caughtErrorsIgnorePattern: '^_', // Ignore caught errors that start with "_"
        },
      ],
      '@typescript-eslint/no-empty-object-type': [
        2,
        {
          allowInterfaces: 'always',
        },
      ],
    },
  },

  //
  // JavaScript files
  //
  {
    files: ['**/*.js', '**/*.mjs'],
    ...js.configs.recommended,
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
      },
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    plugins: {
      prettier,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'prettier/prettier': 'error',
      //
    },
  },

  //
  // JSON files - NOT WORKING?
  //
  // {
  //   files: ['**/*.json'],
  //   ...json.configs.recommended,
  // },
  // {
  //   files: ['**/*.json'],
  // },

  //
  // Markdown files
  //
  ...markdown.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.md'],
  })),
  {
    files: ['**/*.md'],
    rules: {
      // 'markdown/no-html': 'error',
    },
  },
];

// For debugging config
// fs.writeFileSync('eslint-config-final.json', stringify(config, null, 2));

export default config;
