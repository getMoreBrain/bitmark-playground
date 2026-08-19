// @awa-test: PLAN-014-Step4 (TableHtmlRunner drives HTML through the WASM parser)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { BitmarkParserContext } from './BitmarkParser';
import {
  applyHtmlEdit,
  convertHtmlToBitmark,
  noteOriginalMarkup,
  resetTableHtmlRunnerState,
  useTableHtmlRunner,
} from './TableHtmlRunner';

const HTML_DOC = '<bitmark-bit data-type="article">hi</bitmark-bit>';
const BITMARK_DOC = '[.article]\nhi';

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

describe('useTableHtmlRunner', () => {
  beforeEach(() => {
    resetTableHtmlRunnerState();
    bitmarkState.setEditedMarkup('js', '');
    bitmarkState.setTableHtml('', undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts Original bitmark to HTML via the WASM parser html mapping', async () => {
    const convert = vi.fn().mockReturnValue(HTML_DOC);
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('js', BITMARK_DOC);

    await waitFor(() => {
      expect(convert).toHaveBeenCalledWith(
        BITMARK_DOC,
        expect.objectContaining({ inputFormat: 'bitmark', outputFormat: 'html' }),
      );
      expect(bitmarkState.tableHtml.html).toBe(HTML_DOC);
      expect(bitmarkState.tableHtml.htmlError).toBeUndefined();
    });
  });

  it('stores an error when the bitmark -> HTML conversion throws', async () => {
    const convert = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('js', BITMARK_DOC);

    await waitFor(() => expect(bitmarkState.tableHtml.htmlError?.message).toBe('boom'));
  });

  it('treats an `error:` string from convert as an error, not as HTML', async () => {
    const convert = vi.fn().mockReturnValue('error: InvalidBitmark at offset 0');
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('js', BITMARK_DOC);

    await waitFor(() => {
      expect(bitmarkState.tableHtml.htmlError?.message).toContain('InvalidBitmark');
    });
    expect(bitmarkState.tableHtml.html).not.toContain('InvalidBitmark');
  });

  it('clears the HTML when Original markup becomes empty', async () => {
    const convert = vi.fn().mockReturnValue(HTML_DOC);
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('js', BITMARK_DOC);
    await waitFor(() => expect(bitmarkState.tableHtml.html).toBe(HTML_DOC));

    bitmarkState.setEditedMarkup('js', '');
    await waitFor(() => expect(bitmarkState.tableHtml.html).toBe(''));
  });

  it('skips the refresh for a self-induced markup change (no feedback loop)', async () => {
    const convert = vi.fn().mockReturnValue(HTML_DOC);
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convert) });
    convert.mockClear();

    noteOriginalMarkup(BITMARK_DOC);
    bitmarkState.setEditedMarkup('js', BITMARK_DOC);

    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });
});

describe('convertHtmlToBitmark', () => {
  beforeEach(() => resetTableHtmlRunnerState());

  it('converts HTML to bitmark with the html input format', () => {
    const convert = vi.fn().mockReturnValue(BITMARK_DOC);

    const result = convertHtmlToBitmark(convert, HTML_DOC);

    expect(convert).toHaveBeenCalledWith(
      HTML_DOC,
      expect.objectContaining({ inputFormat: 'html', outputFormat: 'bitmark' }),
    );
    expect(result.markup).toBe(BITMARK_DOC);
  });

  it('returns empty bitmark for empty HTML without calling convert', () => {
    const convert = vi.fn().mockReturnValue(BITMARK_DOC);
    expect(convertHtmlToBitmark(convert, '').markup).toBe('');
    expect(convert).not.toHaveBeenCalled();
  });

  it('throws when convert returns an `error:` string', () => {
    const convert = vi.fn().mockReturnValue('error: InvalidHtml at offset 0');
    expect(() => convertHtmlToBitmark(convert, HTML_DOC)).toThrow(/InvalidHtml/);
  });
});

// @awa-test: PLAN-014-Step4 (HTML -> bitmark duration lands on the Original tab)
describe('applyHtmlEdit', () => {
  beforeEach(() => {
    resetTableHtmlRunnerState();
    bitmarkState.setMarkup('js', '', undefined, undefined);
    bitmarkState.setTableHtml('previous html', undefined, 1.5);
  });

  it('records the duration on the Original tab and the edit for the mapping report', async () => {
    const convert = vi.fn().mockReturnValue(BITMARK_DOC);
    const markupToJson = vi.fn().mockResolvedValue(undefined);

    await applyHtmlEdit(convert, HTML_DOC, markupToJson);

    expect(bitmarkState.js.markupDurationSec).toBeGreaterThanOrEqual(0);
    expect(bitmarkState.js.markup).toBe(BITMARK_DOC);
    expect(markupToJson).toHaveBeenCalledWith('js', BITMARK_DOC);

    // The HTML tab keeps the user's text and its own generation time.
    expect(bitmarkState.tableHtml.html).toBe(HTML_DOC);

    // The mapping report source is the HTML window.
    expect(bitmarkState.lastEdit.inputFormat).toBe('html');
    expect(bitmarkState.lastEdit.content).toBe(HTML_DOC);
  });
});
