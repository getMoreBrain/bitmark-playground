/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, Plugin } from 'vite';

/**
 * Serve the parser build of the repository this playground is a submodule of
 * (`packages/bitmark-parser/dist/browser`) at `/local-engine`, so
 * `?engine=local` drives an UNRELEASED parser — the engine bundle, the wasm
 * binaries it fetches beside itself, and the published JSON Schema.
 *
 * Dev only. `main` always loads the published engine from the CDN; this is
 * how a parser change is tried out before it ships.
 */
const localEngine = (): Plugin => {
  const pkg = path.resolve(__dirname, '../../../packages/bitmark-parser');
  const dist = path.join(pkg, 'dist/browser');
  const types: Record<string, string> = {
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.cjs': 'text/javascript',
    '.map': 'application/json',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
  };
  return {
    name: 'bitmark-local-engine',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const marker = '/local-engine/';
        const at = url.indexOf(marker);
        if (at === -1) return next();
        const rel = decodeURIComponent(url.slice(at + marker.length));
        // `schema.json` is the package's published schema, not a dist file.
        const file =
          rel === 'schema.json'
            ? path.join(pkg, 'schema/bitmark.schema.json')
            : path.join(dist, rel);
        if (!file.startsWith(pkg) || !fs.existsSync(file)) {
          res.statusCode = 404;
          res.end(
            `no local engine at ${file} — build it with 'npm run build:ts' in the parser repo`,
          );
          return;
        }
        res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(file).pipe(res);
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    localEngine(),
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
        // The workspace package, from source (PLAN-021 Step 9).
        find: /^@gmb\/bitmark-editor$/,
        replacement: path.resolve(__dirname, 'packages/bitmark-editor/src/index.ts'),
      },
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
    host: true,
    port: 3010,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  test: {
    globals: true,
    // The playground's own tests only; `packages/` carry their own runners.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    alias: {
      '@gmb/bitmark-editor': path.resolve(__dirname, 'packages/bitmark-editor/src/index.ts'),
      'monaco-editor/esm/vs/editor/editor.api': path.resolve(
        __dirname,
        'src/test/__mocks__/monaco-editor.ts',
      ),
      // Stub basic-language contributions (side-effect only) so the bare
      // 'monaco-editor' alias below does not greedily redirect their subpaths.
      'monaco-editor/esm/vs/basic-languages/html/html.contribution': path.resolve(
        __dirname,
        'src/test/__mocks__/monaco-basic-language.ts',
      ),
      'monaco-editor/esm/vs/basic-languages/xml/xml.contribution': path.resolve(
        __dirname,
        'src/test/__mocks__/monaco-basic-language.ts',
      ),
      'monaco-editor': path.resolve(__dirname, 'src/test/__mocks__/monaco-editor.ts'),
      'react-monaco-editor': path.resolve(__dirname, 'src/test/__mocks__/react-monaco-editor.tsx'),
    },
  },
});
