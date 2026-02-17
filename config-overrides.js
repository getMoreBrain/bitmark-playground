// config-overrides.js
const { override, addWebpackResolve, addWebpackPlugin, disableEsLint } = require('customize-cra');

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = override(
  // Disable react-scripts' built-in ESLint 8 plugin — we lint separately via `bun run lint` (ESLint 9 flat config)
  disableEsLint(),
  addWebpackResolve({
    fallback: {
      module: false,
      fs: false,
    },
  }),
  addWebpackPlugin(
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/microsoft/monaco-editor/blob/main/webpack-plugin/README.md#options
      // languages: ['json', 'ini'],
      languages: ['json'],
      // features: ['!gotoSymbol'],
    }),
  ),
  // Suppress missing source map warnings from node_modules (e.g. monaco-editor's bundled marked.js)
  (config) => {
    config.ignoreWarnings = [/Failed to parse source map/];
    return config;
  },
);

// For information on customizing Monaco:
// const metadata = require('monaco-editor/esm/metadata');

// console.log(metadata.features);
// console.log(metadata.languages);
