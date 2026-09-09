// @awa-test: PLAN-017-Step2 (runner installs / removes the parser's editor services)
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setBitmarkCompleteSource } from '../monaco-bitmark/bitmarkCompletion';
import { setBitmarkDiagnosticsSource } from '../monaco-bitmark/bitmarkDiagnostics';
import { setBitmarkHoverSource } from '../monaco-bitmark/bitmarkHover';
import { BitmarkParserContext } from './BitmarkParser';
import { EditorServicesRunner } from './EditorServicesRunner';

vi.mock('../monaco-bitmark/bitmarkCompletion', () => ({ setBitmarkCompleteSource: vi.fn() }));
vi.mock('../monaco-bitmark/bitmarkDiagnostics', () => ({ setBitmarkDiagnosticsSource: vi.fn() }));
vi.mock('../monaco-bitmark/bitmarkHover', () => ({ setBitmarkHoverSource: vi.fn() }));

type ContextValue = Parameters<typeof BitmarkParserContext.Provider>[0]['value'];

const diagnostics = vi.fn();
const complete = vi.fn();
const hover = vi.fn();

const renderWith = (value: Partial<ContextValue>) =>
  render(
    <BitmarkParserContext.Provider
      value={{ loadSuccess: false, loadError: false, version: '', ...value } as ContextValue}
    >
      <EditorServicesRunner />
    </BitmarkParserContext.Provider>,
  );

describe('EditorServicesRunner', () => {
  beforeEach(() => {
    vi.mocked(setBitmarkDiagnosticsSource).mockClear();
    vi.mocked(setBitmarkCompleteSource).mockClear();
    vi.mocked(setBitmarkHoverSource).mockClear();
  });

  it('installs the three services once the parser has loaded, and removes them on unmount', () => {
    const { unmount } = renderWith({
      loadSuccess: true,
      diagnostics: diagnostics as unknown as ContextValue['diagnostics'],
      complete: complete as unknown as ContextValue['complete'],
      hover: hover as unknown as ContextValue['hover'],
    });
    expect(setBitmarkDiagnosticsSource).toHaveBeenLastCalledWith(diagnostics);
    expect(setBitmarkCompleteSource).toHaveBeenLastCalledWith(complete);
    expect(setBitmarkHoverSource).toHaveBeenLastCalledWith(hover);

    unmount();
    expect(setBitmarkDiagnosticsSource).toHaveBeenLastCalledWith(undefined);
    expect(setBitmarkCompleteSource).toHaveBeenLastCalledWith(undefined);
    expect(setBitmarkHoverSource).toHaveBeenLastCalledWith(undefined);
  });

  it('installs nothing before the parser has loaded', () => {
    renderWith({ loadSuccess: false });
    expect(setBitmarkDiagnosticsSource).not.toHaveBeenCalled();
  });

  it('installs only what the loaded parser has — an older engine has no services', () => {
    renderWith({ loadSuccess: true });
    expect(setBitmarkDiagnosticsSource).toHaveBeenLastCalledWith(undefined);
    expect(setBitmarkCompleteSource).toHaveBeenLastCalledWith(undefined);
    expect(setBitmarkHoverSource).toHaveBeenLastCalledWith(undefined);
  });
});
