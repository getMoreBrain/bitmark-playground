// @awa-test: PLAN-003-Step2 (settings menu rendering)
// @awa-test: PLAN-003-Step4 (output tab bar rendering)
// @awa-test: PLAN-003-Step5 (output panel rendering)
/** @jsxImportSource theme-ui */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeUIProvider } from 'theme-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uiState } from '../../../state/uiState';
import { theme } from '../../../theme/theme';
import { OutputPanel } from './OutputPanel';
import { OutputTabBar } from './OutputTabBar';
import { SettingsMenu } from './SettingsMenu';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeUIProvider theme={theme}>{children}</ThemeUIProvider>
);

describe('SettingsMenu', () => {
  beforeEach(() => {
    uiState.setSettingsOpen(false);
    uiState.setShowDiffLex(false);
  });

  it('renders cog icon', () => {
    render(<SettingsMenu />, { wrapper });
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    render(<SettingsMenu />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() => {
      expect(screen.getByText('Show diff / lex')).toBeInTheDocument();
    });
  });

  it('toggles showDiffLex on checkbox change', async () => {
    uiState.setSettingsOpen(true);
    render(<SettingsMenu />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(uiState.showDiffLex).toBe(true);
    });
  });
});

describe('OutputTabBar', () => {
  it('renders label and tabs', () => {
    const tabs = [
      { id: 'diff', label: 'Diff' },
      { id: 'lexer', label: 'Lexer' },
    ];
    render(<OutputTabBar label="bitmark" tabs={tabs} activeTab="diff" onTabChange={() => {}} />, {
      wrapper,
    });
    expect(screen.getByText('bitmark')).toBeInTheDocument();
    expect(screen.getByText('Diff')).toBeInTheDocument();
    expect(screen.getByText('Lexer')).toBeInTheDocument();
  });

  it('calls onTabChange when tab clicked', () => {
    const onTabChange = vi.fn();
    const tabs = [
      { id: 'diff', label: 'Diff' },
      { id: 'lexer', label: 'Lexer' },
    ];
    render(
      <OutputTabBar label="bitmark" tabs={tabs} activeTab="diff" onTabChange={onTabChange} />,
      { wrapper },
    );
    fireEvent.click(screen.getByText('Lexer'));
    expect(onTabChange).toHaveBeenCalledWith('lexer');
  });

  it('marks active tab with aria-selected', () => {
    const tabs = [
      { id: 'diff', label: 'Diff' },
      { id: 'lexer', label: 'Lexer' },
    ];
    render(<OutputTabBar label="test" tabs={tabs} activeTab="lexer" onTabChange={() => {}} />, {
      wrapper,
    });
    expect(screen.getByText('Lexer')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Diff')).toHaveAttribute('aria-selected', 'false');
  });
});

describe('OutputPanel', () => {
  it('renders tab bar with Diff and Lexer tabs', () => {
    render(<OutputPanel label="bitmark" activeTab="diff" onTabChange={() => {}} />, { wrapper });
    expect(screen.getByText('Diff')).toBeInTheDocument();
    expect(screen.getByText('Lexer')).toBeInTheDocument();
  });

  it('calls onTabChange when switching tabs', () => {
    const onTabChange = vi.fn();
    render(<OutputPanel label="JSON" activeTab="diff" onTabChange={onTabChange} />, { wrapper });
    fireEvent.click(screen.getByText('Lexer'));
    expect(onTabChange).toHaveBeenCalledWith('lexer');
  });
});
