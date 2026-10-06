import { proxy } from 'valtio';

import { loadSettings } from '../services/settingsStorage';
import { Writable } from '../utils/TypeScriptUtils';

export type OutputTab = 'diff' | 'lexer' | 'info' | 'mappings';

export interface UiState {
  /** Whether bottom output panels are visible */
  readonly showDiffLex: boolean;
  /** Remembered height (px) for restore */
  readonly bottomPanelHeight: number;
  /** Whether bottom panel is collapsed when visible */
  readonly bottomPanelCollapsed: boolean;
  /** Active tab in left output panel */
  readonly leftOutputTab: OutputTab;
  /** Active tab in right output panel */
  readonly rightOutputTab: OutputTab;
  /** Whether settings dropdown is open */
  readonly settingsOpen: boolean;
  /** Whether the top panes scroll together, by bit (PLAN-018) */
  readonly linkScroll: boolean;

  setShowDiffLex(value: boolean): void;
  setBottomPanelHeight(value: number): void;
  setBottomPanelCollapsed(value: boolean): void;
  setLeftOutputTab(tab: OutputTab): void;
  setRightOutputTab(tab: OutputTab): void;
  setSettingsOpen(value: boolean): void;
  setLinkScroll(value: boolean): void;
}

const stored = loadSettings();

const uiState = proxy<UiState>({
  showDiffLex: stored?.showDiffLex ?? false,
  bottomPanelHeight: 250,
  bottomPanelCollapsed: false,
  leftOutputTab: stored?.leftOutputTab ?? 'diff',
  rightOutputTab: stored?.rightOutputTab ?? 'diff',
  settingsOpen: false,
  linkScroll: stored?.linkScroll ?? true,

  setShowDiffLex(value: boolean) {
    (uiState as Writable<UiState>).showDiffLex = value;
  },

  setBottomPanelHeight(value: number) {
    (uiState as Writable<UiState>).bottomPanelHeight = value;
  },

  setBottomPanelCollapsed(value: boolean) {
    (uiState as Writable<UiState>).bottomPanelCollapsed = value;
  },

  setLeftOutputTab(tab: OutputTab) {
    (uiState as Writable<UiState>).leftOutputTab = tab;
  },

  setRightOutputTab(tab: OutputTab) {
    (uiState as Writable<UiState>).rightOutputTab = tab;
  },

  setSettingsOpen(value: boolean) {
    (uiState as Writable<UiState>).settingsOpen = value;
  },

  setLinkScroll(value: boolean) {
    (uiState as Writable<UiState>).linkScroll = value;
  },
});

export { uiState };
