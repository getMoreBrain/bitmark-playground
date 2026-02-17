// @zen-component: PLAN-003-OutputPanel
/** @jsxImportSource theme-ui */
import { Flex } from 'theme-ui';

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
}

// @zen-impl: PLAN-003-Step5 (output panel)
const OutputPanel = ({ label, activeTab, onTabChange }: OutputPanelProps) => {
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
          backgroundColor: 'background',
          border: '1px solid',
          borderColor: 'accent',
          minHeight: 0,
        }}
      >
        {/* Content placeholder — future diff/lexer output */}
      </Flex>
    </Flex>
  );
};

export { OutputPanel };
