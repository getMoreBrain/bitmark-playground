// @zen-component: PLAN-002-ParserTabBar
/** @jsxImportSource theme-ui */
import { Flex, Text } from 'theme-ui';

import { ParserType } from '../../../state/bitmarkState';

export interface ParserTabBarProps {
  label: string;
  jsDuration: number | undefined;
  wasmDuration: number | undefined;
  wasmFullDuration: number | undefined;
  activeTab: ParserType;
  onTabChange: (tab: ParserType) => void;
}

// @zen-impl: PLAN-002-Step4 (tab bar UI)
const ParserTabBar = (props: ParserTabBarProps) => {
  const { label, jsDuration, wasmDuration, wasmFullDuration, activeTab, onTabChange } = props;

  const formatDuration = (duration: number | undefined): string => {
    if (duration === undefined) return '';
    if (duration >= 1) {
      return ` (${parseFloat(duration.toFixed(3))}s)`;
    }
    const ms = duration * 1000;
    return ` (${parseFloat(ms.toFixed(3))}ms)`;
  };

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
      <Text
        role="tab"
        aria-selected={activeTab === 'js'}
        onClick={() => onTabChange('js')}
        sx={tabSx(activeTab === 'js')}
      >
        Original{formatDuration(jsDuration)}
      </Text>
      <Text
        role="tab"
        aria-selected={activeTab === 'wasm'}
        onClick={() => onTabChange('wasm')}
        sx={{ ...tabSx(activeTab === 'wasm'), ml: '2px' }}
      >
        WASM{formatDuration(wasmDuration)}
      </Text>
      <Text
        role="tab"
        aria-selected={activeTab === 'wasmFull'}
        onClick={() => onTabChange('wasmFull')}
        sx={{ ...tabSx(activeTab === 'wasmFull'), ml: '2px' }}
      >
        WASM (full){formatDuration(wasmFullDuration)}
      </Text>
    </Flex>
  );
};

export { ParserTabBar };
