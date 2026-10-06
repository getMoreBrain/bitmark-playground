import type { Diagnostic } from '@gmb/bitmark-parser';
import type * as MonacoApi from 'monaco-editor';

import type { BitmarkEngine } from '../engine/types';
import { log } from '../log';
import { attachModelJob } from './modelJob';
import type { CodeEditor, IDisposable, Monaco, TextModel } from './types';

/** Marker owner — every marker this module sets is replaced as a group. */
export const BITMARK_MARKER_OWNER = 'bitmark';

/** Delay between the last edit and re-validating. */
export const DIAGNOSTICS_DEBOUNCE_MS = 150;

/** LSP `DiagnosticSeverity`. */
const LSP_SEVERITY = { Error: 1, Warning: 2, Information: 3, Hint: 4 };

/** LSP severity → Monaco marker severity. */
export const markerSeverity = (monaco: Monaco, severity: number): MonacoApi.MarkerSeverity => {
  switch (severity) {
    case LSP_SEVERITY.Error:
      return monaco.MarkerSeverity.Error;
    case LSP_SEVERITY.Warning:
      return monaco.MarkerSeverity.Warning;
    case LSP_SEVERITY.Hint:
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
  monaco: Monaco,
  diagnostics: readonly Diagnostic[],
): MonacoApi.editor.IMarkerData[] =>
  diagnostics.map((d) => {
    const startLineNumber = d.range.start.line + 1;
    const startColumn = d.range.start.character + 1;
    const endLineNumber = d.range.end.line + 1;
    const sameSpot =
      startLineNumber === endLineNumber && d.range.end.character === d.range.start.character;
    return {
      severity: markerSeverity(monaco, d.severity ?? LSP_SEVERITY.Error),
      message: d.message,
      code: d.code === undefined ? undefined : String(d.code),
      source: d.source,
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn: sameSpot ? startColumn + 1 : d.range.end.character + 1,
    };
  });

/**
 * Mark a bitmark editor from the parser's diagnostics: after each change
 * (debounced) the whole document is validated and the issues set as
 * markers. A result for an older text is dropped.
 */
export const attachBitmarkDiagnostics = (
  monaco: Monaco,
  editor: CodeEditor,
  engine: () => BitmarkEngine | undefined,
  debounceMs: number = DIAGNOSTICS_DEBOUNCE_MS,
): IDisposable & { refresh(): void } => {
  const set = (model: TextModel, markers: MonacoApi.editor.IMarkerData[]) =>
    monaco.editor.setModelMarkers(model, BITMARK_MARKER_OWNER, markers);
  const job = attachModelJob({
    editor,
    debounceMs,
    compute: (text) => {
      const e = engine();
      return e?.capabilities.diagnostics ? e.diagnostics(text) : undefined;
    },
    apply: (model, result) =>
      set(model, result ? buildBitmarkMarkers(monaco, result.diagnostics) : []),
    clear: (model) => set(model, []),
    onError: (e, model) => {
      log.error('bitmark diagnostics failed', e);
      set(model, []);
    },
  });
  return {
    refresh: job.run,
    dispose: () => {
      job.dispose();
      const model = editor.getModel();
      if (model) set(model, []);
    },
  };
};
