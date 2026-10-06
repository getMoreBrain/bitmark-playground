/**
 * PLAN-022 Phase 0: the `/bundled` prototype (D4, D12). Monaco + the core,
 * prebuilt. Loads straight from a CDN with no bundler: its CSS and its
 * workers are found beside this file (`import.meta.url`), and the workers
 * start from same-origin blob URLs, as a cross-origin `new Worker(url)` is
 * refused by browsers.
 */
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { createPair, loadEngine, type Monaco, setJsonSchema } from '../proto/core';

const here = import.meta.url;

type Env = { getWorker?: unknown; getWorkerUrl?: unknown };
const g = self as unknown as { MonacoEnvironment?: Env };

/** D8 guard: a page that already has Monaco keeps its own worker setup. */
export const hostMonacoDetected = !!g.MonacoEnvironment;
if (hostMonacoDetected) {
  console.warn(
    '[bitmark-editor] this page already has Monaco (MonacoEnvironment is set); ' +
      'use the /esm build with `monaco: yourMonaco`. Not overwriting the host worker setup.',
  );
} else {
  const workerFile = (label: string) =>
    new URL(label === 'json' ? './json.worker.js' : './editor.worker.js', here).href;
  g.MonacoEnvironment = {
    getWorker: (_id: string, label: string) => {
      // A classic blob worker may importScripts() a cross-origin script.
      const src = `importScripts(${JSON.stringify(workerFile(label))});`;
      return new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    },
  } as Env;
}

/** The CSS sits beside this file; link it once. */
if (!document.querySelector('link[data-bitmark-editor-css]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./bundled.css', here).href;
  link.setAttribute('data-bitmark-editor-css', '');
  document.head.appendChild(link);
}

export const bundledMonaco = monaco as unknown as Monaco;

export { createPair, loadEngine, monaco, setJsonSchema };
