// @awa-component: PLAN-002-ParserTabBar
// @awa-component: PLAN-006-ParserTabBar
// @awa-component: PLAN-007-ParserTabBar
// @awa-component: PLAN-009-ParserTabBar
/** @jsxImportSource theme-ui */
import { Box, Flex, Text } from 'theme-ui';

import { JsonTabType, ParserType } from '../../../state/bitmarkState';
import { WasmCheckLed } from '../../../utils/parserJsonMatch';

const LED_COLOR: Record<WasmCheckLed, string> = {
  match: '#3fb950',
  mismatch: '#f85149',
  neutral: '#444',
};

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
  /** Show the Table (HTML) tab (JSON side only). */
  showTableHtml?: boolean;
  /** Duration for the last HTML-table conversion. */
  tableHtmlDuration?: number | undefined;
  /** Match LED status shown at the far right of the WASM Check tab. */
  wasmCheckLed?: WasmCheckLed;
}

// @awa-impl: PLAN-002-Step4 (tab bar UI)
// @awa-impl: PLAN-006-Step3 (optional WASM Check tab)
// @awa-impl: PLAN-007-Step4 (optional Table (HTML) tab)
// @awa-impl: PLAN-009-Step2 (WASM Check match LED)
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
    showTableHtml = false,
    tableHtmlDuration,
    wasmCheckLed,
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
          {wasmCheckLed ? (
            <Box
              as="span"
              role="status"
              aria-label={`wasm-check-led-${wasmCheckLed}`}
              sx={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                ml: '6px',
                borderRadius: '50%',
                verticalAlign: 'middle',
                backgroundColor: LED_COLOR[wasmCheckLed],
                boxShadow:
                  wasmCheckLed === 'neutral' ? 'none' : `0 0 4px ${LED_COLOR[wasmCheckLed]}`,
              }}
            />
          ) : null}
        </Text>
      ) : null}
      {showTableHtml ? (
        <Text
          role="tab"
          aria-selected={activeTab === 'tableHtml'}
          onClick={() => onTabChange('tableHtml')}
          sx={{ ...tabSx(activeTab === 'tableHtml'), ml: '2px' }}
        >
          Table (HTML){formatDuration(tableHtmlDuration)}
        </Text>
      ) : null}
    </Flex>
  );
};

export { ParserTabBar };
