// config-overrides.js

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = function override(config, env) {
  config.plugins.push(
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/microsoft/monaco-editor/blob/main/webpack-plugin/README.md#options
      languages: ['json', 'ini'],
      // features: ['!gotoSymbol'],
    }),
  );
  return config;
};

// For information on customizing Monaco:
// const metadata = require('monaco-editor/esm/metadata');

// console.log(metadata.features);
// console.log(metadata.languages);
