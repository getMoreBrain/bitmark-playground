// The playground's Monaco setup (workers, JSON, HTML, contributions).
import '../../../src/monaco-setup';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';

import * as monaco from 'monaco-editor';

import type { Monaco } from '../../../src/lib/monaco';
import {
  createBitmarkPane,
  createHtmlPane,
  createJsonPane,
  createTextPane,
} from '../../../src/lib/panes';
import { createBitmarkSession } from '../../../src/lib/session';

const w = window as unknown as Record<string, unknown>;
const t: Record<string, unknown> = (w.__spike = {});
const doc = Array.from({ length: 30 }, (_, i) => `[.article]\nMarker${i}\n\nline\n\nline\n\nline`).join('\n\n');

const session = createBitmarkSession({
  monaco: monaco as unknown as Monaco,
  engine: { url: 'http://localhost:4602/parser/dist/browser/bitmark-parser.min.js' },
  schema: 'http://localhost:4602/parser/schema/bitmark.schema.json',
  value: doc,
});
const el = (id: string) => document.getElementById(id)!;
const panes = {
  bitmark: createBitmarkPane(el('bitmark'), session),
  json: createJsonPane(el('json'), session),
  html: createHtmlPane(el('html'), session),
  text: createTextPane(el('text'), session),
};
w.__session = session;
w.__panes = panes;
w.__monaco = monaco;
session.on('error', (e) => ((t.errors = (t.errors as number | undefined) ?? 0), (t.errors as number)++, console.warn(e.error.message)));
session.ready.then(
  () => (t.ready = true),
  (e) => (t.error = String(e)),
);
