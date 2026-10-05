/**
 * Monaco Editor selective setup.
 *
 * This module replaces the full 'monaco-editor' import (which pulls in ALL languages
 * and features) with selective imports to dramatically reduce bundle size.
 *
 * Only the JSON language service is registered since the app uses:
 * - The WASM bitmark parser's semantic tokens (applied as decorations) for bitmark highlighting
 * - JSON mode for the JSON editor panel
 */

// Import only the JSON language contribution (worker + language features)
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
// @awa-impl: PLAN-017-Step4 (the two editor CONTRIBUTIONS the services need)
//
// The bare 'monaco-editor' alias resolves to `editor.api`, which carries the
// API but none of the editor's feature contributions — a registered
// completion or hover provider would be asked nothing, because neither the
// suggest widget nor the hover controller exists. `editor.main` would pull
// in every contribution and every language; these two are what the parser's
// editor services need, and nothing more.
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution';
// Import codicon font (needed for Monaco's UI icons: folding arrows, suggestions, etc.)
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles';

import * as monaco from 'monaco-editor';
// Configure Monaco to locate the web workers
// This replaces what vite-plugin-monaco-editor was doing
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

import { Monaco, setupBitmarkMonaco } from './lib/monaco';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

// @awa-impl: PLAN-016-Step5 (bitmark language + token stylesheet registered before any editor mounts)
// @awa-impl: PLAN-021-Step4 (on the playground's own Monaco, injected; the
// providers answer for each editor's model with that editor's engine)
setupBitmarkMonaco({ monaco: monaco as unknown as Monaco });
