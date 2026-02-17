// config-overrides.js
const { override, addWebpackResolve, addWebpackPlugin } = require('customize-cra');

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = override(
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
);

// For information on customizing Monaco:
// const metadata = require('monaco-editor/esm/metadata');

// console.log(metadata.features);
// console.log(metadata.languages);
