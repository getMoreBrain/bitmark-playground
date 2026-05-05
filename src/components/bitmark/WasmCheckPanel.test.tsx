// @awa-test: PLAN-006-Step5 (WasmCheckPanel renders read-only bitmark editor)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';
import { WasmCheckPanel } from './WasmCheckPanel';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeUIProvider theme={theme}>{children}</ThemeUIProvider>
);

describe('WasmCheckPanel', () => {
  it('renders a Monaco editor with the markup as value', () => {
    render(<WasmCheckPanel markup="[.article] hi" />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('language', 'bitmark');
    expect(editor).toHaveAttribute('theme', 'vs-dark');
    expect(editor).toHaveAttribute('data-default-value', '[.article] hi');
  });

  it('renders the error string instead of markup when error is present', () => {
    render(<WasmCheckPanel markup="[.article] hi" errorAsString="parser error: boom" />, {
      wrapper,
    });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('data-default-value', 'parser error: boom');
  });
});
