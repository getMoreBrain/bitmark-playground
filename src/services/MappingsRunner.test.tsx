// @awa-test: PLAN-014-Step2 (mapping report for the last edited window)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState, TAB_LABEL } from '../state/bitmarkState';
import { BitmarkParserContext } from './BitmarkParser';
import { reportTargetFor, useMappingsRunner } from './MappingsRunner';
import { XML_LABEL, XML_MAPPING } from './XmlRunner';

const REPORT = 'MAPPING REPORT  input: bitmark → json\n\nOCCURRENCES';

type ContextValue = Parameters<typeof BitmarkParserContext.Provider>[0]['value'];

const makeWrapper = (convert: (input: string, options?: unknown) => string) => {
  const value = {
    loadSuccess: true,
    loadError: false,
    lex: undefined,
    bitmarkToObjects: undefined,
    convert,
    version: 'test',
  } as unknown as ContextValue;

  return ({ children }: { children: React.ReactNode }) => (
    <BitmarkParserContext.Provider value={value}>{children}</BitmarkParserContext.Provider>
  );
};

describe('reportTargetFor', () => {
  // @awa-test: PLAN-014-Step2 (the required direction table)
  it.each([
    ['xml-niso-iec', 'bitmark'],
    ['xml-niso-iec-es', 'bitmark'],
    ['html', 'bitmark'],
    ['bitmark', 'json'],
    ['json', 'bitmark'],
  ])('reports %s into %s', (input, target) => {
    expect(reportTargetFor(input)).toBe(target);
  });
});

describe('useMappingsRunner', () => {
  beforeEach(() => {
    bitmarkState.setMappings('', undefined, undefined);
    bitmarkState.setLastEdit('', '', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['bitmark', '[.article]\nhi', 'json'],
    ['json', '[{"bit":{}}]', 'bitmark'],
    ['html', '<bitmark-bit/>', 'bitmark'],
    ['xml-niso-iec', '<bit/>', 'bitmark'],
    ['xml-niso-iec-es', '<bit/>', 'bitmark'],
  ])('runs the report for a %s edit', async (inputFormat, content, target) => {
    const convert = vi.fn().mockReturnValue(REPORT);
    renderHook(() => useMappingsRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setLastEdit(inputFormat, content, 'A window');

    await waitFor(() => {
      expect(convert).toHaveBeenCalledWith(
        content,
        expect.objectContaining({ inputFormat, outputFormat: target, mappingReport: true }),
      );
    });
    expect(bitmarkState.mappings.report).toContain(REPORT);
    // The header names the window and the direction being reported.
    expect(bitmarkState.mappings.report).toContain('A window');
    expect(bitmarkState.mappings.report).toContain(`${inputFormat} → ${target}`);
  });

  it('re-runs when the same window is edited back to a previous value', async () => {
    const convert = vi.fn().mockReturnValue(REPORT);
    renderHook(() => useMappingsRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setLastEdit('bitmark', 'A', 'W');
    await waitFor(() => expect(convert).toHaveBeenCalledTimes(1));
    bitmarkState.setLastEdit('bitmark', 'B', 'W');
    await waitFor(() => expect(convert).toHaveBeenCalledTimes(2));
    bitmarkState.setLastEdit('bitmark', 'A', 'W');
    await waitFor(() => expect(convert).toHaveBeenCalledTimes(3));
  });

  it('treats an `error:` string as an error, not as a report', async () => {
    const convert = vi.fn().mockReturnValue('error: InvalidJson at offset 0');
    renderHook(() => useMappingsRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setLastEdit('json', '{bad}', 'W');

    await waitFor(() => {
      expect(bitmarkState.mappings.reportError?.message).toContain('InvalidJson');
    });
    expect(bitmarkState.mappings.report).not.toContain('InvalidJson');
  });

  it('clears the report when nothing has been edited', async () => {
    const convert = vi.fn().mockReturnValue(REPORT);
    renderHook(() => useMappingsRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setLastEdit('bitmark', 'x', 'W');
    await waitFor(() => expect(bitmarkState.mappings.report).toContain(REPORT));

    bitmarkState.setLastEdit('bitmark', '', 'W');
    await waitFor(() => expect(bitmarkState.mappings.report).toBe(''));
  });

  it('does not run when the parser is not loaded', async () => {
    const convert = vi.fn().mockReturnValue(REPORT);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BitmarkParserContext.Provider
        value={
          { loadSuccess: false, loadError: false, convert: undefined } as unknown as ContextValue
        }
      >
        {children}
      </BitmarkParserContext.Provider>
    );
    renderHook(() => useMappingsRunner(), { wrapper });

    bitmarkState.setLastEdit('bitmark', 'x', 'W');
    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });
});

// @awa-test: PLAN-014-Step3 (all NINE editable windows report in the right direction)
// Nine windows, but only four code paths record them — three of the paths are
// parameterised over their tabs (3 bitmark + 3 JSON + 2 XML + 1 HTML).
describe('window coverage', () => {
  const WINDOWS: ReadonlyArray<{ label: string; inputFormat: string; target: string }> = [
    { label: 'Original bitmark', inputFormat: 'bitmark', target: 'json' },
    { label: 'WASM bitmark', inputFormat: 'bitmark', target: 'json' },
    { label: 'WASM (full) bitmark', inputFormat: 'bitmark', target: 'json' },
    { label: 'Original JSON', inputFormat: 'json', target: 'bitmark' },
    { label: 'WASM JSON', inputFormat: 'json', target: 'bitmark' },
    { label: 'WASM (full) JSON', inputFormat: 'json', target: 'bitmark' },
    { label: 'XML (NISO-IEC)', inputFormat: 'xml-niso-iec', target: 'bitmark' },
    { label: 'XML (NISO-IEC-ES)', inputFormat: 'xml-niso-iec-es', target: 'bitmark' },
    { label: 'HTML', inputFormat: 'html', target: 'bitmark' },
  ];

  it('covers nine distinct editable windows', () => {
    expect(WINDOWS).toHaveLength(9);
    expect(new Set(WINDOWS.map((w) => w.label)).size).toBe(9);
  });

  it.each(WINDOWS)('reports $label as $inputFormat → $target', ({ inputFormat, target }) => {
    expect(reportTargetFor(inputFormat)).toBe(target);
  });

  it('derives the bitmark/JSON window labels from the tab bar labels', () => {
    // The three parser tabs each contribute one bitmark window and one JSON window.
    for (const tab of ['js', 'wasm', 'wasmFull'] as const) {
      expect(WINDOWS.map((w) => w.label)).toContain(`${TAB_LABEL[tab]} bitmark`);
      expect(WINDOWS.map((w) => w.label)).toContain(`${TAB_LABEL[tab]} JSON`);
    }
  });

  it('derives the XML window labels and formats from the variant tables', () => {
    for (const variant of ['xmlNiso', 'xmlNisoEs'] as const) {
      const win = WINDOWS.find((w) => w.label === XML_LABEL[variant]);
      expect(win).toBeDefined();
      expect(win?.inputFormat).toBe(XML_MAPPING[variant]);
    }
  });
});
