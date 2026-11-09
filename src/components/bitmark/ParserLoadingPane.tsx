import { MONACO_THEME } from '@gmb/bitmark-editor';
import { editor } from 'monaco-editor';
import { ReactNode } from 'react';
import { Box, Flex } from 'theme-ui';

import { MonacoTextArea } from '../monaco/MonacoTextArea';

export interface ParserLoadingPaneProps {
  /** The banner text, e.g. "Loading..." or "Load failed.". */
  message: string;
  /** The host's editor class (its border), as on the editor it stands in for. */
  className?: string | null;
  options?: editor.IStandaloneEditorConstructionOptions;
}

/** A pane's column: an optional banner over the editor, which fills the rest. */
export const PANE_COLUMN_SX = {
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  minHeight: 0,
  boxSizing: 'border-box',
} as const;

/** The editor's part of a pane's column. */
export const PANE_EDITOR_SX = { flex: '1 1 auto', minHeight: 0 } as const;

/**
 * A banner over a pane's editor, in the session panes' look: the package's
 * `--bm-banner-*` colours. A long message scrolls.
 */
export const PaneBanner = ({ children }: { children: ReactNode }) => (
  <Box
    role="status"
    aria-live="polite"
    sx={{
      flex: '0 0 auto',
      maxHeight: '30%',
      overflow: 'auto',
      padding: '2px 8px',
      font: '12px/1.5 system-ui, sans-serif',
      whiteSpace: 'pre-wrap',
      background: 'var(--bm-banner-bg, #3a2d00)',
      color: 'var(--bm-banner-fg, #ffd479)',
    }}
  >
    {children}
  </Box>
);

/**
 * What a playground editor shows while its parser loads: the session panes'
 * look (a banner over an empty, themed editor), so every tab loads alike.
 */
export const ParserLoadingPane = ({ message, className, options }: ParserLoadingPaneProps) => (
  <Flex className={className ?? undefined} sx={PANE_COLUMN_SX}>
    <PaneBanner>{message}</PaneBanner>
    <Box sx={PANE_EDITOR_SX}>
      <MonacoTextArea theme={MONACO_THEME} value="" options={{ ...options, readOnly: true }} />
    </Box>
  </Flex>
);
