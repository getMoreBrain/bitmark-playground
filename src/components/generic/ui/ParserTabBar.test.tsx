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

  // @awa-test: PLAN-007-Step4 (Table (HTML) tab opt-in)
  it('does not render the Table (HTML) tab by default', () => {
    render(<ParserTabBar {...baseProps} />, { wrapper });
    expect(screen.queryByText(/Table \(HTML\)/)).not.toBeInTheDocument();
  });

  it('renders the Table (HTML) tab when showTableHtml is true', () => {
    render(<ParserTabBar {...baseProps} showTableHtml />, { wrapper });
    expect(screen.getByText(/Table \(HTML\)/)).toBeInTheDocument();
  });

  it('calls onTabChange with "tableHtml" when the Table (HTML) tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<ParserTabBar {...baseProps} showTableHtml onTabChange={onTabChange} />, { wrapper });
    fireEvent.click(screen.getByText(/Table \(HTML\)/));
    expect(onTabChange).toHaveBeenCalledWith('tableHtml');
  });

  it('marks Table (HTML) tab as selected when activeTab is tableHtml', () => {
    render(<ParserTabBar {...baseProps} showTableHtml activeTab="tableHtml" />, { wrapper });
    expect(screen.getByText(/Table \(HTML\)/)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/^Original/)).toHaveAttribute('aria-selected', 'false');
  });

  // @awa-test: PLAN-009-Step2 (WASM Check match LED)
  it('renders the match LED on the WASM Check tab with the given status', () => {
    render(<ParserTabBar {...baseProps} showWasmCheck wasmCheckLed="match" />, { wrapper });
    expect(screen.getByLabelText('wasm-check-led-match')).toBeInTheDocument();
  });

  it('renders the mismatch and neutral LED states', () => {
    const { rerender } = render(
      <ParserTabBar {...baseProps} showWasmCheck wasmCheckLed="mismatch" />,
      { wrapper },
    );
    expect(screen.getByLabelText('wasm-check-led-mismatch')).toBeInTheDocument();
    rerender(<ParserTabBar {...baseProps} showWasmCheck wasmCheckLed="neutral" />);
    expect(screen.getByLabelText('wasm-check-led-neutral')).toBeInTheDocument();
  });

  it('does not render the LED when wasmCheckLed is undefined', () => {
    render(<ParserTabBar {...baseProps} showWasmCheck />, { wrapper });
    expect(screen.queryByLabelText(/wasm-check-led/)).not.toBeInTheDocument();
  });

  it('does not render the LED when the WASM Check tab is hidden', () => {
    render(<ParserTabBar {...baseProps} wasmCheckLed="match" />, { wrapper });
    expect(screen.queryByLabelText(/wasm-check-led/)).not.toBeInTheDocument();
  });
});
