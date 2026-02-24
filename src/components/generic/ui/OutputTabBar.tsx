// @zen-component: PLAN-003-OutputTabBar
/** @jsxImportSource theme-ui */
import { Flex, Text } from 'theme-ui';

export interface OutputTab {
  id: string;
  label: string;
}

export interface OutputTabBarProps {
  label: string;
  tabs: OutputTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

// @zen-impl: PLAN-003-Step4 (output tab bar)
const OutputTabBar = ({ label, tabs, activeTab, onTabChange }: OutputTabBarProps) => {
  const tabSx = (active: boolean) =>
    ({
      fontSize: 1,
      px: 2,
      py: '4px',
      cursor: 'pointer',
      color: active ? 'primary' : 'muted',
      fontWeight: active ? 'bold' : 'normal',
      backgroundColor: active ? 'backgroundLight' : 'transparent',
      borderTop: '1px solid',
      borderLeft: '1px solid',
      borderRight: '1px solid',
      borderBottom: active ? 'none' : '1px solid',
      borderColor: active ? 'accent' : 'transparent',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      marginBottom: active ? '-1px' : 0,
      userSelect: 'none' as const,
      '&:hover': {
        color: 'primary',
      },
    }) as const;

  return (
    <Flex
      sx={{
        alignItems: 'flex-end',
        borderBottom: '1px solid',
        borderColor: 'accent',
      }}
    >
      <Text
        sx={{
          variant: 'header.code',
          mb: '4px',
        }}
      >
        {label}
      </Text>
      {tabs.map((tab, i) => (
        <Text
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          sx={{ ...tabSx(activeTab === tab.id), ...(i > 0 ? { ml: '2px' } : {}) }}
        >
          {tab.label}
        </Text>
      ))}
    </Flex>
  );
};

export { OutputTabBar };
