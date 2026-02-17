import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

// Handle both ESM default and CJS interop
const monacoEditorPlugin =
  typeof monacoEditorPluginModule === 'function'
    ? monacoEditorPluginModule
    : (monacoEditorPluginModule as { default: typeof monacoEditorPluginModule }).default;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'theme-ui',
    }),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'json'],
    }),
  ],
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
});
