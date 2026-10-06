/** @jsxImportSource theme-ui */
import { ReactNode } from 'react';
import { Flex } from 'theme-ui';

import { OutputTab as OutputTabType } from '../../../state/uiState';
import { DiffPanel } from '../../bitmark/DiffPanel';
import { OutputTabBar } from './OutputTabBar';

const OUTPUT_TABS = [
  { id: 'diff', label: 'Diff' },
  { id: 'lexer', label: 'Lexer' },
];

const outputTabs = (showInfo: boolean, showMappings: boolean) => [
  ...OUTPUT_TABS,
  ...(showInfo ? [{ id: 'info', label: 'Info' }] : []),
  ...(showMappings ? [{ id: 'mappings', label: 'Mappings' }] : []),
];

export interface OutputPanelProps {
  label: string;
  activeTab: OutputTabType;
  onTabChange: (tab: OutputTabType) => void;
  /** Original content for diff (JS parser output) */
  original?: string;
  /** Modified content for diff (WASM parser output) */
  modified?: string;
  /** Monaco language id for diff editor */
  language?: string;
  /** Lexer output text to display in the Lexer tab */
  lexerOutput?: string;
  /** Show the Info tab (bottom-left panel only). */
  showInfo?: boolean;
  /** The Info tab's content (the playground's session pane, PLAN-023 Step 14). */
  infoPane?: ReactNode;
  /** Show the Mappings tab (bottom-left panel only). */
  showMappings?: boolean;
  /** The Mappings tab's content (the playground's session pane, PLAN-023 Step 14). */
  mappingsPane?: ReactNode;
}

const OutputPanel = ({
  label,
  activeTab,
  onTabChange,
  original,
  modified,
  language,
  lexerOutput,
  showInfo = false,
  infoPane,
  showMappings = false,
  mappingsPane,
}: OutputPanelProps) => {
  return (
    <Flex sx={{ flexDirection: 'column', flexGrow: 1, width: '50%', minHeight: 0 }}>
      <OutputTabBar
        label={label}
        tabs={outputTabs(showInfo, showMappings)}
        activeTab={activeTab}
        onTabChange={(id) => onTabChange(id as OutputTabType)}
      />
      <Flex
        sx={{
          flexGrow: 1,
          flexDirection: 'column',
          backgroundColor: 'background',
          border: '1px solid',
          borderColor: 'accent',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {activeTab === 'diff' && original != null && modified != null && language ? (
          <DiffPanel original={original} modified={modified} language={language} />
        ) : null}
        {activeTab === 'lexer' && lexerOutput != null ? (
          <pre
            sx={{
              margin: 0,
              padding: 2,
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'text',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              overflow: 'auto',
              flexGrow: 1,
            }}
          >
            {lexerOutput}
          </pre>
        ) : null}
        {activeTab === 'info' && showInfo ? infoPane : null}
        {activeTab === 'mappings' && showMappings ? mappingsPane : null}
      </Flex>
    </Flex>
  );
};

export { OutputPanel };
