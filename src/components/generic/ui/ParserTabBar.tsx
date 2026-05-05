// @awa-component: PLAN-002-ParserTabBar
// @awa-component: PLAN-006-ParserTabBar
/** @jsxImportSource theme-ui */
import { Flex, Text } from 'theme-ui';

import { JsonTabType, ParserType } from '../../../state/bitmarkState';

export interface ParserTabBarProps {
  label: string;
  jsDuration: number | undefined;
  wasmDuration: number | undefined;
  wasmFullDuration: number | undefined;
  activeTab: JsonTabType;
  onTabChange: (tab: JsonTabType) => void;
  /** Show the WASM Check tab (JSON side only). */
  showWasmCheck?: boolean;
  /** Duration for the WASM Check round-trip (JS parser). */
  wasmCheckDuration?: number | undefined;
}

// @awa-impl: PLAN-002-Step4 (tab bar UI)
// @awa-impl: PLAN-006-Step3 (optional WASM Check tab)
const ParserTabBar = (props: ParserTabBarProps) => {
  const {
    label,
    jsDuration,
    wasmDuration,
    wasmFullDuration,
    activeTab,
    onTabChange,
    showWasmCheck = false,
    wasmCheckDuration,
  } = props;

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

  const handleParserTabChange = (tab: ParserType) => onTabChange(tab);

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
        onClick={() => handleParserTabChange('js')}
        sx={tabSx(activeTab === 'js')}
      >
        Original{formatDuration(jsDuration)}
      </Text>
      <Text
        role="tab"
        aria-selected={activeTab === 'wasm'}
        onClick={() => handleParserTabChange('wasm')}
        sx={{ ...tabSx(activeTab === 'wasm'), ml: '2px' }}
      >
        WASM{formatDuration(wasmDuration)}
      </Text>
      <Text
        role="tab"
        aria-selected={activeTab === 'wasmFull'}
        onClick={() => handleParserTabChange('wasmFull')}
        sx={{ ...tabSx(activeTab === 'wasmFull'), ml: '2px' }}
      >
        WASM (full){formatDuration(wasmFullDuration)}
      </Text>
      {showWasmCheck ? (
        <Text
          role="tab"
          aria-selected={activeTab === 'wasmCheck'}
          onClick={() => onTabChange('wasmCheck')}
          sx={{ ...tabSx(activeTab === 'wasmCheck'), ml: '2px' }}
        >
          WASM Check{formatDuration(wasmCheckDuration)}
        </Text>
      ) : null}
    </Flex>
  );
};

export { ParserTabBar };
