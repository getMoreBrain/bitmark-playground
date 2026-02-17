// @zen-component: PLAN-003-UiState
import { proxy } from 'valtio';

import { Writable } from '../utils/TypeScriptUtils';

export type OutputTab = 'diff' | 'lexer';

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

  setShowDiffLex(value: boolean): void;
  setBottomPanelHeight(value: number): void;
  setBottomPanelCollapsed(value: boolean): void;
  setLeftOutputTab(tab: OutputTab): void;
  setRightOutputTab(tab: OutputTab): void;
  setSettingsOpen(value: boolean): void;
}

// @zen-impl: PLAN-003-Step1 (settings state)
const uiState = proxy<UiState>({
  showDiffLex: false,
  bottomPanelHeight: 250,
  bottomPanelCollapsed: false,
  leftOutputTab: 'diff',
  rightOutputTab: 'diff',
  settingsOpen: false,

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
});

export { uiState };
