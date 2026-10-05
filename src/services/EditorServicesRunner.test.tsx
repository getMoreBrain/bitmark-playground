// @awa-test: PLAN-018-Step1 (runner installs / removes the parser's splitBits for linked scrolling)
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setSplitBitsSource } from '../scrollSync/scrollSync';
import { BitmarkParserContext } from './BitmarkParser';
import { EditorServicesRunner } from './EditorServicesRunner';

vi.mock('../scrollSync/scrollSync', () => ({ setSplitBitsSource: vi.fn() }));

type ContextValue = Parameters<typeof BitmarkParserContext.Provider>[0]['value'];

const splitBits = vi.fn();

const renderWith = (value: Partial<ContextValue>) =>
  render(
    <BitmarkParserContext.Provider
      value={{ loadSuccess: false, loadError: false, version: '', ...value } as ContextValue}
    >
      <EditorServicesRunner />
    </BitmarkParserContext.Provider>,
  );

describe('EditorServicesRunner', () => {
  beforeEach(() => vi.mocked(setSplitBitsSource).mockClear());

  it('installs splitBits once the parser has loaded, and removes it on unmount', () => {
    const { unmount } = renderWith({ loadSuccess: true, splitBits } as Partial<ContextValue>);
    expect(setSplitBitsSource).toHaveBeenLastCalledWith(splitBits);
    unmount();
    expect(setSplitBitsSource).toHaveBeenLastCalledWith(undefined);
  });

  it('installs nothing before the parser has loaded', () => {
    renderWith({ splitBits } as Partial<ContextValue>);
    expect(setSplitBitsSource).not.toHaveBeenCalled();
  });
});
