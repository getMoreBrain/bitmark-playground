// @awa-component: PLAN-003-SettingsMenu
/** @jsxImportSource theme-ui */
import { useCallback, useEffect, useRef } from 'react';
import { Box, Flex, Label, Text } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { uiState } from '../../../state/uiState';

// @awa-impl: PLAN-003-Step2 (settings menu)
const SettingsMenu = () => {
  const snap = useSnapshot(uiState);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && uiState.settingsOpen) {
      uiState.setSettingsOpen(false);
    }
  }, []);

  // Close on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      uiState.setSettingsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (snap.settingsOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [snap.settingsOpen, handleKeyDown, handleClickOutside]);

  return (
    <Box ref={containerRef} sx={{ position: 'relative', zIndex: 1000, alignSelf: 'stretch' }}>
      <Flex
        role="button"
        aria-label="Settings"
        aria-expanded={snap.settingsOpen}
        onClick={() => uiState.setSettingsOpen(!uiState.settingsOpen)}
        sx={{
          cursor: 'pointer',
          height: '100%',
          alignItems: 'center',
          px: 2,
          color: 'muted',
          userSelect: 'none',
          '&:hover': { color: 'primary' },
        }}
      >
        <Text sx={{ fontSize: 4, lineHeight: 1 }}>⚙</Text>
      </Flex>

      {snap.settingsOpen && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            right: 0,
            minWidth: 200,
            backgroundColor: 'backgroundLight',
            border: '1px solid',
            borderColor: 'accent',
            borderRadius: 4,
            p: 2,
            mt: '2px',
          }}
        >
          <Text sx={{ color: 'primary', fontSize: 1, fontWeight: 'bold', display: 'block' }}>
            Settings
          </Text>

          <Box
            as="hr"
            sx={{ border: 'none', borderTop: '1px solid', borderColor: 'accent', my: 2 }}
          />

          <Text sx={{ color: 'muted', fontSize: 0, fontWeight: 'bold', mb: 1, display: 'block' }}>
            UI
          </Text>

          <Flex sx={{ alignItems: 'center', gap: 2 }}>
            <Label
              sx={{
                cursor: 'pointer',
                fontSize: 1,
                color: 'text',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                width: 'auto',
              }}
            >
              <input
                type="checkbox"
                checked={snap.showDiffLex}
                onChange={(e) => uiState.setShowDiffLex(e.target.checked)}
                style={{ accentColor: '#7dc13a' }}
              />
              Show diff / lex
            </Label>
          </Flex>
        </Box>
      )}
    </Box>
  );
};

export { SettingsMenu };
