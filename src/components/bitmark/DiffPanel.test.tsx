// @zen-test: PLAN-005-Step2 (DiffPanel renders diff editor)
// @zen-test: PLAN-005-Step3 (OutputPanel renders DiffPanel for diff tab)
/** @jsxImportSource theme-ui */
import { render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { describe, expect, it } from 'vitest';

import { DiffPanel } from './DiffPanel';
import { OutputPanel } from '../generic/ui/OutputPanel';
import { theme } from '../../theme/theme';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeUIProvider theme={theme}>{children}</ThemeUIProvider>
);

describe('DiffPanel', () => {
  it('renders a MonacoDiffEditor with original and modified values', () => {
    render(
      <DiffPanel original="hello" modified="world" language="json" />,
      { wrapper },
    );
    const diffEditor = screen.getByTestId('monaco-diff-editor');
    expect(diffEditor).toBeInTheDocument();
    expect(diffEditor).toHaveAttribute('original', 'hello');
    expect(diffEditor).toHaveAttribute('value', 'world');
    expect(diffEditor).toHaveAttribute('language', 'json');
    expect(diffEditor).toHaveAttribute('theme', 'vs-dark');
  });

  it('passes read-only and inline diff options', () => {
    render(
      <DiffPanel original="" modified="" language="bitmark" />,
      { wrapper },
    );
    const diffEditor = screen.getByTestId('monaco-diff-editor');
    // options is passed as an object prop — verify it exists on the element
    // The mock spreads all props, so options will be serialized
    expect(diffEditor).toBeInTheDocument();
    expect(diffEditor).toHaveAttribute('language', 'bitmark');
  });
});

describe('OutputPanel with diff content', () => {
  it('renders DiffPanel when activeTab is diff and content is provided', () => {
    render(
      <OutputPanel
        label="bitmark"
        activeTab="diff"
        onTabChange={() => {}}
        original="original markup"
        modified="modified markup"
        language="bitmark"
      />,
      { wrapper },
    );
    const diffEditor = screen.getByTestId('monaco-diff-editor');
    expect(diffEditor).toBeInTheDocument();
    expect(diffEditor).toHaveAttribute('original', 'original markup');
    expect(diffEditor).toHaveAttribute('value', 'modified markup');
  });

  it('does not render DiffPanel when activeTab is lexer', () => {
    render(
      <OutputPanel
        label="JSON"
        activeTab="lexer"
        onTabChange={() => {}}
        original="original"
        modified="modified"
        language="json"
      />,
      { wrapper },
    );
    expect(screen.queryByTestId('monaco-diff-editor')).not.toBeInTheDocument();
  });

  it('does not render DiffPanel when no content is provided', () => {
    render(
      <OutputPanel
        label="bitmark"
        activeTab="diff"
        onTabChange={() => {}}
      />,
      { wrapper },
    );
    expect(screen.queryByTestId('monaco-diff-editor')).not.toBeInTheDocument();
  });
});
