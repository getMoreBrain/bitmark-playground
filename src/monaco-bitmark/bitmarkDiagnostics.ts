// @awa-component: PLAN-017-BitmarkDiagnostics
import debounce from 'lodash/debounce';
import * as monaco from 'monaco-editor';

import { log } from '../logging/log';
import { BitmarkDiagnostic, DiagnosticsSource, LspSeverity } from './bitmarkEditorTypes';

/** Marker owner — every marker this module sets is replaced as a group. */
export const BITMARK_MARKER_OWNER = 'bitmark';

/** Delay between the last edit and re-validating. */
export const DIAGNOSTICS_DEBOUNCE_MS = 150;

/** LSP severity → Monaco marker severity. */
export const markerSeverity = (severity: number): monaco.MarkerSeverity => {
  switch (severity) {
    case LspSeverity.Error:
      return monaco.MarkerSeverity.Error;
    case LspSeverity.Warning:
      return monaco.MarkerSeverity.Warning;
    case LspSeverity.Hint:
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Info;
  }
};

/**
 * The parser's diagnostics as Monaco markers. LSP positions are 0-based and
 * `end` is exclusive; Monaco's are 1-based with an exclusive end column, so
 * both ends shift by one. A zero-length range would draw nothing, so it is
 * widened to one column.
 */
export const buildBitmarkMarkers = (
  diagnostics: readonly BitmarkDiagnostic[],
): monaco.editor.IMarkerData[] =>
  diagnostics.map((d) => {
    const startLineNumber = d.range.start.line + 1;
    const startColumn = d.range.start.character + 1;
    const endLineNumber = d.range.end.line + 1;
    const sameSpot =
      startLineNumber === endLineNumber && d.range.end.character === d.range.start.character;
    return {
      severity: markerSeverity(d.severity),
      message: d.message,
      code: d.code,
      source: d.source,
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn: sameSpot ? startColumn + 1 : d.range.end.character + 1,
    };
  });

let source: DiagnosticsSource | undefined;
const attached = new Set<() => void>();

/**
 * Install (or, with `undefined`, remove) the parser function that validates
 * bitmark editors. Every attached editor re-validates immediately.
 */
export const setBitmarkDiagnosticsSource = (next: DiagnosticsSource | undefined): void => {
  source = next;
  for (const validate of attached) validate();
};

/**
 * Mark a bitmark editor from the parser's diagnostics: on every content
 * change (debounced) the whole document is validated and the issues are set
 * as markers. Dispose to detach and clear.
 */
export const attachBitmarkDiagnostics = (
  editor: monaco.editor.ICodeEditor,
  debounceMs: number = DIAGNOSTICS_DEBOUNCE_MS,
): monaco.IDisposable => {
  const clear = () => {
    const model = editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, BITMARK_MARKER_OWNER, []);
  };

  const validate = () => {
    const model = editor.getModel();
    if (!model) return;
    if (!source) {
      clear();
      return;
    }
    try {
      const result = source(model.getValue(), { positionEncoding: 'utf-16' });
      monaco.editor.setModelMarkers(
        model,
        BITMARK_MARKER_OWNER,
        buildBitmarkMarkers(result.diagnostics),
      );
    } catch (e) {
      log.error('bitmark diagnostics failed', e);
      clear();
    }
  };
  const validateDebounced = debounce(validate, debounceMs);

  const listeners = [
    editor.onDidChangeModelContent(() => validateDebounced()),
    editor.onDidChangeModel(() => validateDebounced()),
  ];
  attached.add(validate);
  validate();

  return {
    dispose: () => {
      validateDebounced.cancel();
      attached.delete(validate);
      for (const listener of listeners) listener.dispose();
      clear();
    },
  };
};
