// @awa-component: PLAN-003-OutputPanel
// @awa-component: PLAN-005-OutputPanel
/** @jsxImportSource theme-ui */
import { Flex } from 'theme-ui';

import { DiffPanel } from '../../bitmark/DiffPanel';
import { OutputTab as OutputTabType } from '../../../state/uiState';
import { OutputTabBar } from './OutputTabBar';

const OUTPUT_TABS = [
  { id: 'diff', label: 'Diff' },
  { id: 'lexer', label: 'Lexer' },
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
}

// @awa-impl: PLAN-003-Step5 (output panel)
// @awa-impl: PLAN-005-Step3 (wire DiffPanel into OutputPanel)
const OutputPanel = ({
  label,
  activeTab,
  onTabChange,
  original,
  modified,
  language,
  lexerOutput,
}: OutputPanelProps) => {
  return (
    <Flex sx={{ flexDirection: 'column', flexGrow: 1, width: '50%', minHeight: 0 }}>
      <OutputTabBar
        label={label}
        tabs={OUTPUT_TABS}
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
      </Flex>
    </Flex>
  );
};

export { OutputPanel };
