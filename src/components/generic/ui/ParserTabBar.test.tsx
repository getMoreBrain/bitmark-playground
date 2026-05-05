// @awa-test: PLAN-006-Step3 (ParserTabBar WASM Check tab opt-in)
/** @jsxImportSource theme-ui */
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '../../../theme/theme';
import { ParserTabBar } from './ParserTabBar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeUIProvider theme={theme}>{children}</ThemeUIProvider>
);

describe('ParserTabBar', () => {
  const baseProps = {
    label: 'JSON',
    jsDuration: undefined,
    wasmDuration: undefined,
    wasmFullDuration: undefined,
    activeTab: 'js' as const,
    onTabChange: () => {},
  };

  it('does not render the WASM Check tab by default', () => {
    render(<ParserTabBar {...baseProps} />, { wrapper });
    expect(screen.queryByText(/WASM Check/)).not.toBeInTheDocument();
  });

  it('renders the WASM Check tab when showWasmCheck is true', () => {
    render(<ParserTabBar {...baseProps} showWasmCheck />, { wrapper });
    expect(screen.getByText(/WASM Check/)).toBeInTheDocument();
  });

  it('calls onTabChange with "wasmCheck" when the tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<ParserTabBar {...baseProps} showWasmCheck onTabChange={onTabChange} />, { wrapper });
    fireEvent.click(screen.getByText(/WASM Check/));
    expect(onTabChange).toHaveBeenCalledWith('wasmCheck');
  });

  it('marks WASM Check tab as selected when activeTab is wasmCheck', () => {
    render(<ParserTabBar {...baseProps} showWasmCheck activeTab="wasmCheck" />, { wrapper });
    expect(screen.getByText(/WASM Check/)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/^Original/)).toHaveAttribute('aria-selected', 'false');
  });
});
