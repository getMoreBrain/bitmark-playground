// @awa-component: PLAN-002-App
/** @jsxImportSource theme-ui */
import './App.css';

import { useMemo } from 'react';
import { Flex, ThemeUIProvider } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { BitmarkJsonTextBox } from './components/bitmark/BitmarkJsonTextBox';
import { BitmarkMarkupTextBox } from './components/bitmark/BitmarkMarkupTextBox';
import { OutputPanel } from './components/generic/ui/OutputPanel';
import { ParserTabBar } from './components/generic/ui/ParserTabBar';
import { ResizableLayout } from './components/generic/ui/ResizableLayout';
import { SettingsMenu } from './components/generic/ui/SettingsMenu';
import { Copyright } from './components/version/Copyright';
import { Version } from './components/version/Version';
import { BitmarkParserProvider } from './services/BitmarkParser';
import { BitmarkParserGeneratorProvider } from './services/BitmarkParserGenerator';
import { TableHtmlRunner } from './services/TableHtmlRunner';
import { WasmCheckRunner } from './services/WasmCheckRunner';
import { bitmarkState } from './state/bitmarkState';
import { uiState } from './state/uiState';
import { theme } from './theme/theme';
import { parserJsonMatch, WasmCheckLed } from './utils/parserJsonMatch';
import { reorderJsonStringToReference } from './utils/reorderJsonKeys';

const initialMarkup = '[.article] Hello World!';

// @awa-impl: PLAN-002-Step5 (tab bar integration)
// @awa-impl: PLAN-002-Step7 (provider nesting)
// @awa-impl: PLAN-003-Step6 (App integration)
function App() {
  const snap = useSnapshot(bitmarkState);
  const uiSnap = useSnapshot(uiState);

  // @awa-impl: PLAN-009-Step3 (Original vs WASM-opt match LED, recomputed on data change)
  const wasmCheckLed = useMemo<WasmCheckLed>(() => {
    if (snap.js.jsonError || snap.wasm.jsonError) return 'neutral';
    return parserJsonMatch(snap.js.json, snap.wasm.json);
  }, [snap.js.json, snap.wasm.json, snap.js.jsonError, snap.wasm.jsonError]);

  // @awa-impl: PLAN-010 (reorder WASM JSON keys to match Original before the JSON diff)
  const wasmJsonForDiff = useMemo(
    () => reorderJsonStringToReference(snap.js.jsonAsString, snap.wasm.jsonAsString),
    [snap.js.jsonAsString, snap.wasm.jsonAsString],
  );

  const editorPanels = (
    <Flex
      sx={{
        flexDirection: 'row',
        flexGrow: 1,
        minHeight: 0,
      }}
    >
      <Flex
        sx={{
          flexDirection: 'column',
          flexGrow: 1,
          width: '50%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Flex sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <ParserTabBar
            label="bitmark"
            jsDuration={snap.js.markupDurationSec}
            wasmDuration={snap.wasm.markupDurationSec}
            wasmFullDuration={snap.wasmFull.markupDurationSec}
            activeTab={snap.activeMarkupTab}
            onTabChange={(tab) => {
              if (tab !== 'wasmCheck' && tab !== 'tableHtml') bitmarkState.setActiveMarkupTab(tab);
            }}
          />
        </Flex>
        <Flex
          sx={{
            resize: 'none',
            variant: 'textarea.code',
            flexGrow: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <BitmarkMarkupTextBox
            className={'markup-editor'}
            sx={{
              border: '1px solid',
              borderColor: 'accent',
            }}
            initialMarkup={initialMarkup}
            options={{
              wordWrap: 'on',
            }}
          />
        </Flex>
      </Flex>
      <Flex
        sx={{
          flexDirection: 'column',
          flexGrow: 1,
          width: '50%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Flex sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <ParserTabBar
            label="JSON"
            jsDuration={snap.js.jsonDurationSec}
            wasmDuration={snap.wasm.jsonDurationSec}
            wasmFullDuration={snap.wasmFull.jsonDurationSec}
            activeTab={snap.activeJsonTab}
            onTabChange={(tab) => bitmarkState.setActiveJsonTab(tab)}
            showWasmCheck
            wasmCheckDuration={snap.wasmCheck.markupDurationSec}
            wasmCheckLed={wasmCheckLed}
            showTableHtml
            tableHtmlDuration={snap.tableHtml.htmlDurationSec}
          />
          <Flex sx={{ flexGrow: 1 }} />
          <SettingsMenu />
        </Flex>
        <Flex
          sx={{
            resize: 'none',
            variant: 'textarea.code',
            flexGrow: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <BitmarkJsonTextBox
            className={'json-editor'}
            sx={{
              border: '1px solid',
              borderColor: 'accent',
            }}
            options={{
              wordWrap: 'on',
            }}
          />
        </Flex>
      </Flex>
    </Flex>
  );

  // @awa-impl: PLAN-005-Step4 (wire state data to diff panels)
  const bottomPanels = (
    <Flex sx={{ flexDirection: 'row', flexGrow: 1, minHeight: 0 }}>
      <OutputPanel
        label="bitmark"
        activeTab={uiSnap.leftOutputTab}
        onTabChange={(tab) => uiState.setLeftOutputTab(tab)}
        original={snap.js.markup}
        modified={snap.wasm.markup}
        language="bitmark"
        lexerOutput={snap.wasm.lexerOutput}
      />
      <OutputPanel
        label="JSON"
        activeTab={uiSnap.rightOutputTab}
        onTabChange={(tab) => uiState.setRightOutputTab(tab)}
        original={snap.js.jsonAsString}
        modified={wasmJsonForDiff}
        language="json"
        lexerOutput={snap.wasmFull.lexerOutput}
      />
    </Flex>
  );

  return (
    <ThemeUIProvider theme={theme}>
      <BitmarkParserGeneratorProvider>
        <BitmarkParserProvider>
          <WasmCheckRunner />
          <TableHtmlRunner />
          <Flex
            sx={{
              flexDirection: 'column',
              height: '100vh',
              width: '100vw',
              backgroundColor: 'background',
            }}
          >
            {/* Always render ResizableLayout so the editor panels keep a stable
                tree position — toggling the Diff/Lex panels must not remount the
                editors (which would reset their content). */}
            <ResizableLayout
              top={editorPanels}
              bottom={bottomPanels}
              showBottom={uiSnap.showDiffLex}
              bottomHeight={uiSnap.bottomPanelHeight}
              collapsed={uiSnap.bottomPanelCollapsed}
              onHeightChange={(h) => uiState.setBottomPanelHeight(h)}
              onToggleCollapse={() =>
                uiState.setBottomPanelCollapsed(!uiState.bottomPanelCollapsed)
              }
            />
            <Flex
              sx={{
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <Version
                sx={{
                  variant: 'text.copyright',
                }}
              />
              <Copyright
                sx={{
                  variant: 'text.copyright',
                }}
              />
            </Flex>
          </Flex>
        </BitmarkParserProvider>
      </BitmarkParserGeneratorProvider>
    </ThemeUIProvider>
  );
}

export { App };
