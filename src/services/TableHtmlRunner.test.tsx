// @awa-test: PLAN-007-Step2 (TableHtmlRunner Original -> HTML refresh + loop prevention)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState } from '../state/bitmarkState';
import { BitmarkParserGeneratorContext } from './BitmarkParserGenerator';
import { convertHtmlToBitmark, noteOriginalMarkup, useTableHtmlRunner } from './TableHtmlRunner';

const HTML_FRAGMENT = '<table><tr><td>cell</td></tr></table>';
const BITMARK_TABLE = '[.table-extended]\n| cell |';

const makeWrapper = (convertHtmlTable: (input: string, options?: unknown) => unknown) => {
  const fakeParser = { convertHtmlTable } as unknown as Parameters<
    typeof BitmarkParserGeneratorContext.Provider
  >[0]['value']['bitmarkParserGenerator'];

  return ({ children }: { children: React.ReactNode }) => (
    <BitmarkParserGeneratorContext.Provider
      value={{
        loadSuccess: true,
        loadError: false,
        bitmarkParserGenerator: fakeParser,
      }}
    >
      {children}
    </BitmarkParserGeneratorContext.Provider>
  );
};

describe('useTableHtmlRunner', () => {
  beforeEach(() => {
    // Reset Original markup baseline and tableHtml slice to a clean state.
    bitmarkState.setEditedMarkup('js', '');
    bitmarkState.setTableHtml('', undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts Original bitmark to HTML when js.markup changes', async () => {
    const convertHtmlTable = vi.fn().mockReturnValue(HTML_FRAGMENT);
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convertHtmlTable) });

    bitmarkState.setEditedMarkup('js', BITMARK_TABLE);

    await waitFor(() => {
      expect(convertHtmlTable).toHaveBeenCalledWith(
        BITMARK_TABLE,
        expect.objectContaining({ inputFormat: 'bitmark', outputFormat: 'html' }),
      );
      expect(bitmarkState.tableHtml.html).toBe(HTML_FRAGMENT);
      expect(bitmarkState.tableHtml.htmlError).toBeUndefined();
    });
  });

  it('stores error when the bitmark -> HTML conversion throws', async () => {
    const convertHtmlTable = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convertHtmlTable) });

    bitmarkState.setEditedMarkup('js', '[.article] no table here');

    await waitFor(() => {
      expect(bitmarkState.tableHtml.htmlError).toBeDefined();
      expect(bitmarkState.tableHtml.htmlError?.message).toBe('boom');
      expect(bitmarkState.tableHtml.htmlErrorAsString).toContain('boom');
    });
  });

  it('clears tableHtml when Original markup becomes empty', async () => {
    const convertHtmlTable = vi.fn().mockReturnValue(HTML_FRAGMENT);
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convertHtmlTable) });

    bitmarkState.setEditedMarkup('js', BITMARK_TABLE);
    await waitFor(() => {
      expect(bitmarkState.tableHtml.html).toBe(HTML_FRAGMENT);
    });

    bitmarkState.setEditedMarkup('js', '');
    await waitFor(() => {
      expect(bitmarkState.tableHtml.html).toBe('');
      expect(bitmarkState.tableHtml.htmlError).toBeUndefined();
    });
  });

  it('does not refresh HTML for a self-induced markup change (loop prevention)', async () => {
    const convertHtmlTable = vi.fn().mockReturnValue(HTML_FRAGMENT);
    renderHook(() => useTableHtmlRunner(), { wrapper: makeWrapper(convertHtmlTable) });

    // Simulate Flow A having produced this bitmark from HTML: pre-seed the dedupe,
    // then push the same markup into Original. The Original -> HTML refresh must skip it.
    noteOriginalMarkup('[.table-extended] from-html');
    bitmarkState.setEditedMarkup('js', '[.table-extended] from-html');

    await new Promise((r) => setTimeout(r, 10));
    expect(convertHtmlTable).not.toHaveBeenCalled();
  });

  it('does not convert when the parser is not loaded', async () => {
    const convertHtmlTable = vi.fn().mockReturnValue(HTML_FRAGMENT);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BitmarkParserGeneratorContext.Provider
        value={{ loadSuccess: false, loadError: false, bitmarkParserGenerator: undefined }}
      >
        {children}
      </BitmarkParserGeneratorContext.Provider>
    );
    renderHook(() => useTableHtmlRunner(), { wrapper });

    bitmarkState.setEditedMarkup('js', BITMARK_TABLE);
    await new Promise((r) => setTimeout(r, 10));
    expect(convertHtmlTable).not.toHaveBeenCalled();
  });
});

describe('convertHtmlToBitmark', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts HTML to bitmark with the html input format', async () => {
    const convertHtmlTable = vi.fn().mockReturnValue(BITMARK_TABLE);
    const parser = { convertHtmlTable } as unknown as Parameters<typeof convertHtmlToBitmark>[0];

    const result = await convertHtmlToBitmark(parser, HTML_FRAGMENT);

    expect(convertHtmlTable).toHaveBeenCalledWith(
      HTML_FRAGMENT,
      expect.objectContaining({ inputFormat: 'html', outputFormat: 'bitmark' }),
    );
    expect(result.markup).toBe(BITMARK_TABLE);
    expect(typeof result.durationSec).toBe('number');
  });

  it('returns empty markup for empty HTML without calling the parser', async () => {
    const convertHtmlTable = vi.fn().mockReturnValue(BITMARK_TABLE);
    const parser = { convertHtmlTable } as unknown as Parameters<typeof convertHtmlToBitmark>[0];

    const result = await convertHtmlToBitmark(parser, '');

    expect(convertHtmlTable).not.toHaveBeenCalled();
    expect(result.markup).toBe('');
  });

  it('throws when convertHtmlTable is unsupported by the parser', async () => {
    const parser = {} as unknown as Parameters<typeof convertHtmlToBitmark>[0];
    await expect(convertHtmlToBitmark(parser, HTML_FRAGMENT)).rejects.toThrow(/not supported/);
  });
});
