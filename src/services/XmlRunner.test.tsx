// @awa-test: PLAN-013-Step2 (XmlRunner WASM -> XML refresh + loop prevention, per variant)
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bitmarkState, XmlVariant } from '../state/bitmarkState';
import { BitmarkParserContext } from './BitmarkParser';
import {
  applyXmlEdit,
  convertXmlToBitmark,
  noteWasmMarkup,
  resetXmlRunnerState,
  useXmlRunner,
  XML_MAPPING,
} from './XmlRunner';

const XML_DOC = '<bit type="article"><node type="paragraph">hi</node></bit>';
const BITMARK_DOC = '[.article]\nhi';

const VARIANTS: readonly XmlVariant[] = ['xmlNiso', 'xmlNisoEs'];

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

describe.each(VARIANTS)('useXmlRunner(%s)', (variant) => {
  const mappingId = XML_MAPPING[variant];

  beforeEach(() => {
    // Reset the WASM markup baseline and both xml slices to a clean state.
    resetXmlRunnerState();
    bitmarkState.setEditedMarkup('wasm', '');
    for (const v of VARIANTS) bitmarkState.setXml(v, '', undefined, undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it(`converts WASM bitmark to XML using the ${mappingId} mapping`, async () => {
    const convert = vi.fn().mockReturnValue(XML_DOC);
    renderHook(() => useXmlRunner(variant), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);

    await waitFor(() => {
      expect(convert).toHaveBeenCalledWith(
        BITMARK_DOC,
        expect.objectContaining({ inputFormat: 'bitmark', outputFormat: mappingId }),
      );
      expect(bitmarkState[variant].xml).toBe(XML_DOC);
      expect(bitmarkState[variant].xmlError).toBeUndefined();
    });
  });

  it('stores an error when the bitmark -> XML conversion throws', async () => {
    const convert = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    renderHook(() => useXmlRunner(variant), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);

    await waitFor(() => {
      expect(bitmarkState[variant].xmlError?.message).toBe('boom');
    });
  });

  it('treats an `error:` string from convert as an error, not as XML', async () => {
    const convert = vi.fn().mockReturnValue('error: InvalidBitmark at offset 0');
    renderHook(() => useXmlRunner(variant), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);

    await waitFor(() => {
      expect(bitmarkState[variant].xmlError?.message).toContain('InvalidBitmark');
    });
    expect(bitmarkState[variant].xml).not.toContain('InvalidBitmark');
  });

  it('clears the XML when wasm.markup becomes empty', async () => {
    const convert = vi.fn().mockReturnValue(XML_DOC);
    renderHook(() => useXmlRunner(variant), { wrapper: makeWrapper(convert) });

    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);
    await waitFor(() => expect(bitmarkState[variant].xml).toBe(XML_DOC));

    bitmarkState.setEditedMarkup('wasm', '');
    await waitFor(() => {
      expect(bitmarkState[variant].xml).toBe('');
      expect(bitmarkState[variant].xmlError).toBeUndefined();
    });
  });

  it('skips the refresh for a self-induced markup change (no feedback loop)', async () => {
    const convert = vi.fn().mockReturnValue(XML_DOC);
    renderHook(() => useXmlRunner(variant), { wrapper: makeWrapper(convert) });
    convert.mockClear();

    // Flow A pre-seeds this variant's guard before the markup write lands.
    noteWasmMarkup(variant, BITMARK_DOC);
    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);

    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });

  it('does not convert when the parser is not loaded', async () => {
    const convert = vi.fn().mockReturnValue(XML_DOC);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BitmarkParserContext.Provider
        value={
          {
            loadSuccess: false,
            loadError: false,
            lex: undefined,
            bitmarkToObjects: undefined,
            convert: undefined,
            version: '',
          } as unknown as ContextValue
        }
      >
        {children}
      </BitmarkParserContext.Provider>
    );
    renderHook(() => useXmlRunner(variant), { wrapper });

    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);
    await new Promise((r) => setTimeout(r, 10));
    expect(convert).not.toHaveBeenCalled();
  });
});

describe('XML_MAPPING', () => {
  // @awa-test: PLAN-013-Step2 (each variant maps to its own config mapping id)
  it('maps each variant to a distinct config mapping id', () => {
    expect(XML_MAPPING.xmlNiso).toBe('xml-niso-iec');
    expect(XML_MAPPING.xmlNisoEs).toBe('xml-niso-iec-es');
  });
});

describe.each(VARIANTS)('convertXmlToBitmark(%s)', (variant) => {
  const mappingId = XML_MAPPING[variant];

  it(`converts XML to bitmark using the ${mappingId} mapping`, () => {
    const convert = vi.fn().mockReturnValue(BITMARK_DOC);

    const result = convertXmlToBitmark(convert, variant, XML_DOC);

    expect(convert).toHaveBeenCalledWith(
      XML_DOC,
      expect.objectContaining({ inputFormat: mappingId, outputFormat: 'bitmark' }),
    );
    expect(result.markup).toBe(BITMARK_DOC);
    expect(result.durationSec).toBeGreaterThanOrEqual(0);
  });

  it('returns empty bitmark for empty XML without calling convert', () => {
    const convert = vi.fn().mockReturnValue(BITMARK_DOC);

    const result = convertXmlToBitmark(convert, variant, '');

    expect(convert).not.toHaveBeenCalled();
    expect(result.markup).toBe('');
  });

  it('throws when convert returns an `error:` string', () => {
    const convert = vi.fn().mockReturnValue('error: InvalidXml at offset 0');

    expect(() => convertXmlToBitmark(convert, variant, XML_DOC)).toThrow(/InvalidXml/);
  });
});

// @awa-test: PLAN-013-Step2 (editing one XML tab regenerates the OTHER variant)
// Each case mounts exactly ONE runner, so the assertion cannot be masked by the
// order in which two subscribers happen to evaluate.
describe('cross-variant refresh', () => {
  beforeEach(() => {
    resetXmlRunnerState();
    bitmarkState.setEditedMarkup('wasm', '');
    for (const v of VARIANTS) bitmarkState.setXml(v, '', undefined, undefined);
  });

  it.each([
    ['xmlNiso', 'xmlNisoEs'],
    ['xmlNisoEs', 'xmlNiso'],
  ] as const)('a Flow A edit in %s still regenerates %s', async (edited, other) => {
    const convertOther = vi.fn().mockReturnValue(XML_DOC);
    // ONLY the other variant's runner is mounted.
    renderHook(() => useXmlRunner(other), { wrapper: makeWrapper(convertOther) });
    convertOther.mockClear();

    // Flow A in the *edited* tab arms its own one-shot skip.
    convertXmlToBitmark(vi.fn().mockReturnValue(BITMARK_DOC), edited, XML_DOC);
    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);

    // The other variant is a different mapping of the same document — it MUST
    // regenerate, otherwise it sits there showing stale XML.
    await waitFor(() => {
      expect(convertOther).toHaveBeenCalledWith(
        BITMARK_DOC,
        expect.objectContaining({ inputFormat: 'bitmark', outputFormat: XML_MAPPING[other] }),
      );
    });
    expect(bitmarkState[other].xml).toBe(XML_DOC);
  });

  it.each(VARIANTS)('a Flow A edit in %s does NOT clobber its own editor', async (edited) => {
    const convertEdited = vi.fn().mockReturnValue(XML_DOC);
    // ONLY the edited variant's runner is mounted.
    renderHook(() => useXmlRunner(edited), { wrapper: makeWrapper(convertEdited) });
    convertEdited.mockClear();

    convertXmlToBitmark(vi.fn().mockReturnValue(BITMARK_DOC), edited, XML_DOC);
    bitmarkState.setEditedMarkup('wasm', BITMARK_DOC);

    await new Promise((r) => setTimeout(r, 10));
    expect(convertEdited).not.toHaveBeenCalled();
  });
});

// @awa-test: PLAN-013-Step3 (XML -> bitmark duration is recorded on the WASM bitmark tab)
describe('applyXmlEdit', () => {
  const XML_IN = '<bit type="article"><node type="paragraph">hi</node></bit>';
  const BITMARK_OUT = '[.article]\nhi';

  beforeEach(() => {
    resetXmlRunnerState();
    bitmarkState.setMarkup('wasm', '', undefined, undefined);
    // Seed the XML tab with a previous bitmark -> XML generation time.
    bitmarkState.setXml('xmlNiso', 'previously generated xml', undefined, 1.5);
  });

  it('records the conversion duration on the WASM tab, not the XML tab', async () => {
    const convert = vi.fn().mockReturnValue(BITMARK_OUT);
    const markupToJson = vi.fn().mockResolvedValue(undefined);

    await applyXmlEdit(convert, 'xmlNiso', XML_IN, markupToJson);

    // The XML -> bitmark time belongs to the tab whose content it generated.
    expect(bitmarkState.wasm.markupDurationSec).toBeGreaterThanOrEqual(0);
    expect(bitmarkState.wasm.markup).toBe(BITMARK_OUT);

    // The XML tab keeps its own (bitmark -> XML) generation time untouched.
    expect(bitmarkState.xmlNiso.xmlDurationSec).toBe(1.5);
    expect(bitmarkState.xmlNiso.xml).toBe(XML_IN);

    // ...and the bitmark is propagated through the normal round-trip convention.
    expect(markupToJson).toHaveBeenCalledWith('wasm', BITMARK_OUT);
  });

  it('stores the error and does not touch either duration when conversion fails', async () => {
    const convert = vi.fn().mockReturnValue('error: InvalidXml at offset 0');
    const markupToJson = vi.fn().mockResolvedValue(undefined);

    await applyXmlEdit(convert, 'xmlNiso', XML_IN, markupToJson);

    expect(bitmarkState.xmlNiso.xmlError?.message).toContain('InvalidXml');
    expect(bitmarkState.xmlNiso.xmlDurationSec).toBe(1.5);
    expect(bitmarkState.wasm.markupDurationSec).toBeUndefined();
    expect(markupToJson).not.toHaveBeenCalled();
  });
});
