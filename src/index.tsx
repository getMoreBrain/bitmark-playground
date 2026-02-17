import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Parser } from 'web-tree-sitter';
import treeSitterWasmUrl from 'web-tree-sitter/tree-sitter.wasm?url';

import { App } from './App';
import { Theme, ThemeConfig } from './monaco-tree-sitter/theme';
import treeSitterTheme from './monaco-tree-sitter/themes/tomorrow.json';

async function start(): Promise<void> {
  // Load the monaco-tree-sitter theme
  Theme.load(treeSitterTheme as ThemeConfig, 'tomorrow');

  // Init tree-sitter-web
  await Parser.init({
    locateFile: () => treeSitterWasmUrl,
  });

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void start();
