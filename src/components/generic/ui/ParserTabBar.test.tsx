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

  // @awa-test: PLAN-011-Step4 (Text tab opt-in)
  it('does not render the Text tab by default', () => {
    render(<ParserTabBar {...baseProps} />, { wrapper });
    expect(screen.queryByText(/^Text/)).not.toBeInTheDocument();
  });

  it('renders the Text tab when showText is true', () => {
    render(<ParserTabBar {...baseProps} showText />, { wrapper });
    expect(screen.getByText(/^Text/)).toBeInTheDocument();
  });

  it('calls onTabChange with "text" when the Text tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<ParserTabBar {...baseProps} showText onTabChange={onTabChange} />, { wrapper });
    fireEvent.click(screen.getByText(/^Text/));
    expect(onTabChange).toHaveBeenCalledWith('text');
  });

  it('marks Text tab as selected when activeTab is text', () => {
    render(<ParserTabBar {...baseProps} showText activeTab="text" />, { wrapper });
    expect(screen.getByText(/^Text/)).toHaveAttribute('aria-selected', 'true');
  });

  // @awa-test: PLAN-013-Step4 (ParserTabBar XML (NISO-IEC) tab opt-in)
  it('does not render the XML (NISO-IEC) tab by default', () => {
    render(<ParserTabBar {...baseProps} />, { wrapper });
    expect(screen.queryByText(/XML \(NISO-IEC\)/)).not.toBeInTheDocument();
  });

  it('renders the XML (NISO-IEC) tab when showXmlNiso is true', () => {
    render(<ParserTabBar {...baseProps} showXmlNiso />, { wrapper });
    expect(screen.getByText(/XML \(NISO-IEC\)/)).toBeInTheDocument();
  });

  it('calls onTabChange with "xmlNiso" when the XML tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<ParserTabBar {...baseProps} showXmlNiso onTabChange={onTabChange} />, { wrapper });
    fireEvent.click(screen.getByText(/XML \(NISO-IEC\)/));
    expect(onTabChange).toHaveBeenCalledWith('xmlNiso');
  });

  it('marks the XML tab as selected when activeTab is xmlNiso', () => {
    render(<ParserTabBar {...baseProps} showXmlNiso activeTab="xmlNiso" />, { wrapper });
    expect(screen.getByText(/XML \(NISO-IEC\)$/)).toHaveAttribute('aria-selected', 'true');
  });

  // @awa-test: PLAN-013-Step4 (ParserTabBar XML (NISO-IEC-ES) tab opt-in)
  it('does not render the XML (NISO-IEC-ES) tab by default', () => {
    render(<ParserTabBar {...baseProps} />, { wrapper });
    expect(screen.queryByText(/XML \(NISO-IEC-ES\)/)).not.toBeInTheDocument();
  });

  it('renders the XML (NISO-IEC-ES) tab when showXmlNisoEs is true', () => {
    render(<ParserTabBar {...baseProps} showXmlNisoEs />, { wrapper });
    expect(screen.getByText(/XML \(NISO-IEC-ES\)/)).toBeInTheDocument();
  });

  it('calls onTabChange with "xmlNisoEs" when the ES XML tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<ParserTabBar {...baseProps} showXmlNisoEs onTabChange={onTabChange} />, { wrapper });
    fireEvent.click(screen.getByText(/XML \(NISO-IEC-ES\)/));
    expect(onTabChange).toHaveBeenCalledWith('xmlNisoEs');
  });

  it('marks the ES XML tab as selected when activeTab is xmlNisoEs', () => {
    render(<ParserTabBar {...baseProps} showXmlNisoEs activeTab="xmlNisoEs" />, { wrapper });
    expect(screen.getByText(/XML \(NISO-IEC-ES\)/)).toHaveAttribute('aria-selected', 'true');
  });

  // @awa-test: PLAN-013-Step4 (both XML tabs render side by side)
  it('renders both XML tabs when both are enabled', () => {
    render(<ParserTabBar {...baseProps} showXmlNiso showXmlNisoEs />, { wrapper });
    expect(screen.getByText(/XML \(NISO-IEC\)$/)).toBeInTheDocument();
    expect(screen.getByText(/XML \(NISO-IEC-ES\)/)).toBeInTheDocument();
  });
});
