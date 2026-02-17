/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'theme-ui',
    }),
    visualizer({
      filename: 'bundle-stats.html',
      gzipSize: true,
      template: 'treemap',
    }),
  ],
  resolve: {
    alias: [
      {
        // Redirect bare 'monaco-editor' imports to the selective API entry point.
        // This avoids pulling in editor.main.js which imports ALL languages and features.
        // Uses regex with word boundary to avoid matching 'monaco-editor/esm/...' subpath imports.
        find: /^monaco-editor$/,
        replacement: 'monaco-editor/esm/vs/editor/editor.api',
      },
    ],
  },
  base: '/bitmark-playground/',
  server: {
    port: 3010,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  // Handle .wasm files as assets
  assetsInclude: ['**/*.wasm'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    alias: {
      'monaco-editor/esm/vs/editor/editor.api': path.resolve(
        __dirname,
        'src/test/__mocks__/monaco-editor.ts',
      ),
      'monaco-editor': path.resolve(__dirname, 'src/test/__mocks__/monaco-editor.ts'),
      'react-monaco-editor': path.resolve(__dirname, 'src/test/__mocks__/react-monaco-editor.tsx'),
    },
  },
});
