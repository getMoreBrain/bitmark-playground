/** @jsxImportSource theme-ui */
import { ReactNode } from 'react';
import { Flex } from 'theme-ui';

import { STACKED_PANEL_SX } from '../../../utils/narrowLayout';
import { Tab, TabBar } from './TabBar';

export interface OutputPanelProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  /** The active tab's content. */
  children?: ReactNode;
}

/** A bottom panel: its tabs and the active tab's content. */
const OutputPanel = <T extends string>({
  tabs,
  activeTab,
  onTabChange,
  children,
}: OutputPanelProps<T>) => {
  return (
    <Flex
      sx={{ flexDirection: 'column', flexGrow: 1, width: '50%', minHeight: 0, ...STACKED_PANEL_SX }}
    >
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
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
        {children}
      </Flex>
    </Flex>
  );
};

export { OutputPanel };
