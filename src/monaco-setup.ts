/**
 * Monaco Editor selective setup.
 *
 * This module replaces the full 'monaco-editor' import (which pulls in ALL languages
 * and features) with selective imports to dramatically reduce bundle size.
 *
 * Only the JSON language service is registered since the app uses:
 * - Tree-sitter for bitmark syntax highlighting
 * - JSON mode for the JSON editor panel
 */

// Import only the JSON language contribution (worker + language features)
import 'monaco-editor/esm/vs/language/json/monaco.contribution';

// Import codicon font (needed for Monaco's UI icons: folding arrows, suggestions, etc.)
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles';

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
