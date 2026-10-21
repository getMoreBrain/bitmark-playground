/** @jsxImportSource theme-ui */
import { useCallback, useEffect, useState } from 'react';
import { Box } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { uiState } from '../../../state/uiState';

/** Remembered on its own, not with the settings (no settings migration). */
export const LEGACY_HINT_KEY = 'bitmark-playground-legacy-hint-dismissed';

const isDismissed = (): boolean => {
  try {
    return localStorage.getItem(LEGACY_HINT_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberDismissed = (): void => {
  try {
    localStorage.setItem(LEGACY_HINT_KEY, '1');
  } catch {
    // Private mode: it shows again next time.
  }
};

/**
 * A popover under the Settings cog, on page load, telling where the legacy
 * parser went (PLAN-026 D1). Closed with ×, or by opening Settings; once
 * closed it is not shown again. Not shown while the legacy parser is on.
 */
const LegacyParserHint = () => {
  const { settingsOpen, showLegacy } = useSnapshot(uiState);
  const [dismissed, setDismissed] = useState(isDismissed);

  const dismiss = useCallback(() => {
    setDismissed(true);
    rememberDismissed();
  }, []);

  // Opening Settings: found it.
  useEffect(() => {
    if (settingsOpen && !dismissed) dismiss();
  }, [settingsOpen, dismissed, dismiss]);

  if (dismissed || showLegacy || settingsOpen) return null;

  return (
    <Box
      role="note"
      sx={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1,
        pl: 2,
        pr: 1,
        borderRadius: 4,
        backgroundColor: 'primary',
        color: 'background',
        fontSize: 1,
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgb(0 0 0 / 0.5)',
        // The arrow, up at the cog.
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-6px',
          right: '12px',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid',
          borderBottomColor: 'primary',
        },
      }}
    >
      Old Parser Here
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        sx={{
          px: 1,
          border: 0,
          background: 'none',
          color: 'background',
          fontSize: 2,
          lineHeight: 1,
          cursor: 'pointer',
          opacity: 0.7,
          '&:hover': { opacity: 1 },
        }}
      >
        ×
      </button>
    </Box>
  );
};

export { LegacyParserHint };
