// @awa-test: PLAN-017-Step1 (parser diagnostics -> Monaco markers, debounced per editor)
import * as monaco from 'monaco-editor';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../logging/log';
import {
  attachBitmarkDiagnostics,
  BITMARK_MARKER_OWNER,
  buildBitmarkMarkers,
  DIAGNOSTICS_DEBOUNCE_MS,
  markerSeverity,
  setBitmarkDiagnosticsSource,
} from './bitmarkDiagnostics';
import { BitmarkDiagnostic, DiagnosticsSource, LspSeverity } from './bitmarkEditorTypes';

const diagnostic = (
  line: number,
  start: number,
  end: number,
  severity: number,
  code: string,
): BitmarkDiagnostic => ({
  range: { start: { line, character: start }, end: { line, character: end } },
  severity,
  code,
  source: 'bitmark',
  message: `${code} here`,
  data: { bit: 0 },
});

// Fake parser: one warning per non-empty line.
const fakeSource = ((input: string) => ({
  positionEncoding: 'utf-16',
  diagnostics: input
    .split('\n')
    .map((text, line) =>
      text.length === 0
        ? undefined
        : diagnostic(line, 0, text.length, LspSeverity.Warning, 'unknown-property'),
    )
    .filter((d): d is BitmarkDiagnostic => d !== undefined),
})) as unknown as DiagnosticsSource;

const makeEditor = (initial: string) => {
  let value = initial;
  const listeners: (() => void)[] = [];
  const model = { getValue: () => value } as unknown as monaco.editor.ITextModel;
  const editor = {
    getModel: () => model,
    onDidChangeModelContent: (cb: () => void) => {
      listeners.push(cb);
      return { dispose: () => listeners.splice(listeners.indexOf(cb), 1) };
    },
    onDidChangeModel: () => ({ dispose: () => {} }),
  } as unknown as monaco.editor.ICodeEditor;
  return {
    editor,
    type: (next: string) => {
      value = next;
      for (const cb of [...listeners]) cb();
    },
  };
};

describe('markerSeverity', () => {
  it('maps the three LSP severities the parser produces', () => {
    expect(markerSeverity(LspSeverity.Error)).toBe(monaco.MarkerSeverity.Error);
    expect(markerSeverity(LspSeverity.Warning)).toBe(monaco.MarkerSeverity.Warning);
    expect(markerSeverity(LspSeverity.Information)).toBe(monaco.MarkerSeverity.Info);
  });
});

describe('buildBitmarkMarkers', () => {
  it('shifts 0-based LSP positions to Monaco 1-based, keeping code and source', () => {
    const [marker] = buildBitmarkMarkers([
      diagnostic(1, 0, 8, LspSeverity.Error, 'unknown-bit-type'),
    ]);
    expect(marker).toMatchObject({
      severity: monaco.MarkerSeverity.Error,
      code: 'unknown-bit-type',
      source: 'bitmark',
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 9,
    });
  });

  it('widens an empty range so the marker is visible', () => {
    const [marker] = buildBitmarkMarkers([diagnostic(0, 3, 3, LspSeverity.Warning, 'x')]);
    expect(marker.startColumn).toBe(4);
    expect(marker.endColumn).toBe(5);
  });
});

describe('attachBitmarkDiagnostics', () => {
  let setModelMarkers: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    setModelMarkers = vi.spyOn(monaco.editor, 'setModelMarkers').mockImplementation(() => {});
  });

  afterEach(() => {
    setBitmarkDiagnosticsSource(undefined);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const lastCall = () => setModelMarkers.mock.calls.at(-1);
  const lastMarkers = () => lastCall()?.[2] as monaco.editor.IMarkerData[] | undefined;

  it('marks on attach and re-marks after an edit, debounced', () => {
    setBitmarkDiagnosticsSource(fakeSource);
    const { editor, type } = makeEditor('[.article]');
    const attached = attachBitmarkDiagnostics(editor);

    expect(lastMarkers()).toHaveLength(1);
    expect(lastCall()?.[1]).toBe(BITMARK_MARKER_OWNER);

    type('[.article]\n[@nope:1]');
    // Nothing yet — validation is debounced.
    expect(lastMarkers()).toHaveLength(1);
    vi.advanceTimersByTime(DIAGNOSTICS_DEBOUNCE_MS);
    expect(lastMarkers()).toHaveLength(2);

    attached.dispose();
    expect(lastMarkers()).toEqual([]);
  });

  it('re-marks every attached editor when the parser arrives', () => {
    const { editor } = makeEditor('[.article]');
    attachBitmarkDiagnostics(editor);
    expect(lastMarkers()).toEqual([]);

    setBitmarkDiagnosticsSource(fakeSource);
    expect(lastMarkers()).toHaveLength(1);
  });

  it('survives a failing parser', () => {
    const error = vi.spyOn(log, 'error').mockImplementation(() => {});
    setBitmarkDiagnosticsSource((() => {
      throw new Error('boom');
    }) as unknown as DiagnosticsSource);
    const { editor } = makeEditor('[.article]');
    expect(() => attachBitmarkDiagnostics(editor)).not.toThrow();
    expect(error).toHaveBeenCalled();
    expect(lastMarkers()).toEqual([]);
  });
});
