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

  // @awa-test: PLAN-014-Step5 (Mappings tab is opt-in, bottom-left panel only)
  it('does not render the Mappings tab by default', () => {
    render(<OutputPanel label="JSON" activeTab="diff" onTabChange={() => {}} />, { wrapper });
    expect(screen.queryByText('Mappings')).not.toBeInTheDocument();
  });

  it('renders the Mappings tab when showMappings is true', () => {
    render(<OutputPanel label="bitmark" activeTab="diff" onTabChange={() => {}} showMappings />, {
      wrapper,
    });
    expect(screen.getByText('Mappings')).toBeInTheDocument();
  });

  it('calls onTabChange with "mappings" when the Mappings tab is clicked', () => {
    const onTabChange = vi.fn();
    render(
      <OutputPanel label="bitmark" activeTab="diff" onTabChange={onTabChange} showMappings />,
      { wrapper },
    );
    fireEvent.click(screen.getByText('Mappings'));
    expect(onTabChange).toHaveBeenCalledWith('mappings');
  });

  // @awa-test: PLAN-015-Step4 (Info tab is opt-in, bottom-left panel only)
  it('does not render the Info tab by default', () => {
    render(<OutputPanel label="JSON" activeTab="diff" onTabChange={() => {}} />, { wrapper });
    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  it('renders the Info tab when showInfo is true', () => {
    render(<OutputPanel label="bitmark" activeTab="diff" onTabChange={() => {}} showInfo />, {
      wrapper,
    });
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  // @awa-test: PLAN-015-Step4 (Info sits between Lexer and Mappings)
  it('renders the Info tab immediately left of Mappings', () => {
    render(
      <OutputPanel label="bitmark" activeTab="diff" onTabChange={() => {}} showInfo showMappings />,
      { wrapper },
    );
    const labels = screen.getAllByRole('tab').map((el) => el.textContent);
    expect(labels).toEqual(['Diff', 'Lexer', 'Info', 'Mappings']);
  });

  it('calls onTabChange with "info" when the Info tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<OutputPanel label="bitmark" activeTab="diff" onTabChange={onTabChange} showInfo />, {
      wrapper,
    });
    fireEvent.click(screen.getByText('Info'));
    expect(onTabChange).toHaveBeenCalledWith('info');
  });

  it('shows the info output when the Info tab is active', () => {
    render(
      <OutputPanel
        label="bitmark"
        activeTab="info"
        onTabChange={() => {}}
        showInfo
        infoOutput="BIT INFO: article"
      />,
      { wrapper },
    );
    expect(screen.getByText(/BIT INFO/)).toBeInTheDocument();
  });

  it('shows the mapping report when the Mappings tab is active', () => {
    render(
      <OutputPanel
        label="bitmark"
        activeTab="mappings"
        onTabChange={() => {}}
        showMappings
        mappingsOutput="MAPPING REPORT  input: bitmark → json"
      />,
      { wrapper },
    );
    expect(screen.getByText(/MAPPING REPORT/)).toBeInTheDocument();
  });
});
