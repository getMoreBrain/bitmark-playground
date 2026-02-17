// @zen-test: PLAN-003-Step1 (uiState defaults and mutations)
import { describe, expect, it } from 'vitest';

import { uiState } from './uiState';

describe('uiState', () => {
  it('has correct defaults', () => {
    expect(uiState.showDiffLex).toBe(false);
    expect(uiState.bottomPanelHeight).toBe(250);
    expect(uiState.bottomPanelCollapsed).toBe(false);
    expect(uiState.leftOutputTab).toBe('diff');
    expect(uiState.rightOutputTab).toBe('diff');
    expect(uiState.settingsOpen).toBe(false);
  });

  it('setShowDiffLex updates state', () => {
    uiState.setShowDiffLex(true);
    expect(uiState.showDiffLex).toBe(true);
    uiState.setShowDiffLex(false);
    expect(uiState.showDiffLex).toBe(false);
  });

  it('setBottomPanelHeight updates state', () => {
    uiState.setBottomPanelHeight(300);
    expect(uiState.bottomPanelHeight).toBe(300);
    uiState.setBottomPanelHeight(250);
  });

  it('setBottomPanelCollapsed updates state', () => {
    uiState.setBottomPanelCollapsed(true);
    expect(uiState.bottomPanelCollapsed).toBe(true);
    uiState.setBottomPanelCollapsed(false);
  });

  it('setLeftOutputTab updates state', () => {
    uiState.setLeftOutputTab('lexer');
    expect(uiState.leftOutputTab).toBe('lexer');
    uiState.setLeftOutputTab('diff');
  });

  it('setRightOutputTab updates state', () => {
    uiState.setRightOutputTab('lexer');
    expect(uiState.rightOutputTab).toBe('lexer');
    uiState.setRightOutputTab('diff');
  });

  it('setSettingsOpen updates state', () => {
    uiState.setSettingsOpen(true);
    expect(uiState.settingsOpen).toBe(true);
    uiState.setSettingsOpen(false);
  });
});
