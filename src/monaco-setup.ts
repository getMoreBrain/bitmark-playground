/**
 * Monaco Editor selective setup.
 *
 * This module replaces the full 'monaco-editor' import (which pulls in ALL languages
 * and features) with selective imports to dramatically reduce bundle size.
 *
 * Only the JSON language service is registered since the app uses:
 * - The WASM bitmark parser's semantic tokens (applied as decorations) for bitmark highlighting
 * - JSON mode for the JSON editor panel
 * plus HTML and XML highlighting (basic languages, no workers) for the HTML and XML panes.
 */

// Import only the JSON language contribution (worker + language features)
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
// HTML and XML highlighting for the package's HTML and XML panes: the
// selective API registers no languages, and the package leaves them to the host.
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
// The bare 'monaco-editor' alias resolves to `editor.api`, which carries the
// API but none of the editor's feature contributions — a registered
// completion or hover provider would be asked nothing, because neither the
// suggest widget nor the hover controller exists. `editor.main` would pull
// in every contribution and every language; these two are what the parser's
// editor services need, and nothing more.
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution';
// Each pane's own find/replace widget (Ctrl+H, F3): without it the browser's
// find sees only the lines Monaco has rendered (PLAN-024 D8).
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController';
// Import codicon font (needed for Monaco's UI icons: folding arrows, suggestions, etc.)
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles';

import { Monaco, setupBitmarkMonaco } from '@gmb/bitmark-editor';
import * as monaco from 'monaco-editor';
// Configure Monaco to locate the web workers
// This replaces what vite-plugin-monaco-editor was doing
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

setupBitmarkMonaco({ monaco: monaco as unknown as Monaco });
