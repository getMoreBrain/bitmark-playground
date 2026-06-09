// @awa-test: PLAN-011-Step3 (TextPanel renders read-only plain-text editor)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';
import { TextPanel } from './TextPanel';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeUIProvider theme={theme}>{children}</ThemeUIProvider>
);

describe('TextPanel', () => {
  it('renders a Monaco editor (language=plaintext) with the text value', () => {
    render(<TextPanel text="hello text" />, { wrapper });
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('language', 'plaintext');
    expect(editor).toHaveAttribute('theme', 'vs-dark');
    expect(editor).toHaveAttribute('data-default-value', 'hello text');
  });

  it('renders the error string instead of text when present', () => {
    render(<TextPanel text="hi" errorAsString="conversion failed" />, { wrapper });
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute(
      'data-default-value',
      'conversion failed',
    );
  });
});
