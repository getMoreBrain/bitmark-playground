// The playground's own Monaco setup: workers (Vite `?worker`), the JSON
// language, the suggest and hover contributions.
import '../../../src/monaco-setup';

// Bare, as playground code imports it: the root copy, through Vite's pre-bundle.
import * as monaco from 'monaco-editor';

import { createPair, loadEngine, type Monaco, setJsonSchema } from '../spikes/proto/core';

const w = window as unknown as Record<string, unknown>;
const t: Record<string, unknown> = (w.__spike = { start: performance.now() });
const CDN = 'http://localhost:4602';

void (async () => {
  try {
    const engine = await loadEngine(`${CDN}/parser/dist/browser/bitmark-parser.min.js`);
    const schema = await fetch(`${CDN}/parser/schema/bitmark.schema.json`).then((r) => r.json());
    t.schemaApplied = setJsonSchema(monaco as unknown as Monaco, schema);
    w.__pair = createPair({
      monaco: monaco as unknown as Monaco,
      engine,
      bitmarkElement: document.querySelector<HTMLElement>('[data-pane="bitmark"]')!,
      jsonElement: document.querySelector<HTMLElement>('[data-pane="json"]')!,
      value: '[.article]\nHello **World**!\n\n[.cloze]\nThe capital of France is [_Paris].',
      applyMonacoTheme: true,
    });
    w.__monaco = monaco;
    t.globalMonaco = 'monaco' in window;
    t.mounted = performance.now();
  } catch (e) {
    t.error = String(e);
    console.error(e);
  }
})();
