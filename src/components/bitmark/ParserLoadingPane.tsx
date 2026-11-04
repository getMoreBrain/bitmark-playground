import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { Box, Flex } from 'theme-ui';

import { MonacoTextArea } from '../monaco/MonacoTextArea';

export interface ParserLoadingPaneProps {
  /** The banner text, e.g. "Loading..." or "Load failed.". */
  message: string;
  /** The host's editor class (its border), as on the editor it stands in for. */
  className?: string | null;
  options?: editor.IStandaloneEditorConstructionOptions;
}

/**
 * What a playground editor shows while its parser loads: the session panes'
 * look (a banner over an empty, themed editor), so every tab loads alike.
 * The banner uses the package's `--bm-banner-*` colours.
 */
export const ParserLoadingPane = ({ message, className, options }: ParserLoadingPaneProps) => (
  <Flex
    className={className ?? undefined}
    sx={{
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      minHeight: 0,
      boxSizing: 'border-box',
    }}
  >
    <Box
      role="status"
      aria-live="polite"
      sx={{
        flex: '0 0 auto',
        padding: '2px 8px',
        font: '12px/1.5 system-ui, sans-serif',
        background: 'var(--bm-banner-bg, #3a2d00)',
        color: 'var(--bm-banner-fg, #ffd479)',
      }}
    >
      {message}
    </Box>
    <Box sx={{ flex: '1 1 auto', minHeight: 0 }}>
      <MonacoTextArea theme={MONACO_THEME} value="" options={{ ...options, readOnly: true }} />
    </Box>
  </Flex>
);
