import { proxy } from 'valtio';

import { loadSettings } from '../services/settingsStorage';
import { Writable } from '../utils/TypeScriptUtils';
import { bitmarkState } from './bitmarkState';

export type OutputTab = 'info' | 'mappings' | 'lexer';

export interface UiState {
  /** Whether bottom output panels are visible */
  readonly showBottomPanels: boolean;
  /** Remembered height (px) for restore */
  readonly bottomPanelHeight: number;
  /** Whether bottom panel is collapsed when visible */
  readonly bottomPanelCollapsed: boolean;
  /** Active tab in left output panel */
  readonly leftOutputTab: OutputTab;
  /** Whether settings dropdown is open */
  readonly settingsOpen: boolean;
  /** Whether the top panes scroll together, by bit (PLAN-018) */
  readonly linkScroll: boolean;
  /** Whether the WASM parsers write inline marks as toggle tags (PLAN-025) */
  readonly toggleTags: boolean;
  /** Whether the WASM parser runs in full mode, not optimised (PLAN-026 D2) */
  readonly fullOutput: boolean;
  /** Whether the legacy parser (bpg) and its tabs are on (PLAN-026 D1) */
  readonly showLegacy: boolean;

  setShowBottomPanels(value: boolean): void;
  setBottomPanelHeight(value: number): void;
  setBottomPanelCollapsed(value: boolean): void;
  setLeftOutputTab(tab: OutputTab): void;
  setSettingsOpen(value: boolean): void;
  setLinkScroll(value: boolean): void;
  setToggleTags(value: boolean): void;
  setFullOutput(value: boolean): void;
  setShowLegacy(value: boolean): void;
}

const stored = loadSettings();

const uiState = proxy<UiState>({
  showBottomPanels: stored?.showBottomPanels ?? false,
  bottomPanelHeight: 250,
  bottomPanelCollapsed: false,
  leftOutputTab: stored?.leftOutputTab ?? 'info',
  settingsOpen: false,
  linkScroll: stored?.linkScroll ?? true,
  toggleTags: stored?.toggleTags ?? false,
  fullOutput: stored?.fullOutput ?? false,
  showLegacy: stored?.showLegacy ?? false,

  setShowBottomPanels(value: boolean) {
    (uiState as Writable<UiState>).showBottomPanels = value;
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

  setSettingsOpen(value: boolean) {
    (uiState as Writable<UiState>).settingsOpen = value;
  },

  setLinkScroll(value: boolean) {
    (uiState as Writable<UiState>).linkScroll = value;
  },

  setToggleTags(value: boolean) {
    (uiState as Writable<UiState>).toggleTags = value;
  },

  setFullOutput(value: boolean) {
    (uiState as Writable<UiState>).fullOutput = value;
  },

  setShowLegacy(value: boolean) {
    (uiState as Writable<UiState>).showLegacy = value;
    if (value) return;
    // A Legacy tab that was shown goes with it (PLAN-026 D12).
    if (bitmarkState.activeMarkupTab === 'legacy') bitmarkState.setActiveMarkupTab('bitmark');
    if (bitmarkState.activeJsonTab === 'legacy') bitmarkState.setActiveJsonTab('json');
  },
});

export { uiState };
