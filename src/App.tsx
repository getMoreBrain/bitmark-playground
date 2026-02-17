// @zen-component: PLAN-002-App
/** @jsxImportSource theme-ui */
import './App.css';

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
import { bitmarkState } from './state/bitmarkState';
import { uiState } from './state/uiState';
import { theme } from './theme/theme';

const initialMarkup = '[.article] Hello World!';

// @zen-impl: PLAN-002-Step5 (tab bar integration)
// @zen-impl: PLAN-002-Step7 (provider nesting)
// @zen-impl: PLAN-003-Step6 (App integration)
function App() {
  const snap = useSnapshot(bitmarkState);
  const uiSnap = useSnapshot(uiState);

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
            onTabChange={(tab) => bitmarkState.setActiveMarkupTab(tab)}
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

  const bottomPanels = (
    <Flex sx={{ flexDirection: 'row', flexGrow: 1, minHeight: 0 }}>
      <OutputPanel
        label="bitmark"
        activeTab={uiSnap.leftOutputTab}
        onTabChange={(tab) => uiState.setLeftOutputTab(tab)}
      />
      <OutputPanel
        label="JSON"
        activeTab={uiSnap.rightOutputTab}
        onTabChange={(tab) => uiState.setRightOutputTab(tab)}
      />
    </Flex>
  );

  return (
    <ThemeUIProvider theme={theme}>
      <BitmarkParserGeneratorProvider>
        <BitmarkParserProvider>
          <Flex
            sx={{
              flexDirection: 'column',
              height: '100vh',
              width: '100vw',
              backgroundColor: 'background',
            }}
          >
            {uiSnap.showDiffLex ? (
              <ResizableLayout
                top={editorPanels}
                bottom={bottomPanels}
                bottomHeight={uiSnap.bottomPanelHeight}
                collapsed={uiSnap.bottomPanelCollapsed}
                onHeightChange={(h) => uiState.setBottomPanelHeight(h)}
                onToggleCollapse={() =>
                  uiState.setBottomPanelCollapsed(!uiState.bottomPanelCollapsed)
                }
              />
            ) : (
              <Flex sx={{ flexGrow: 1, minHeight: 0, flexDirection: 'column' }}>
                {editorPanels}
              </Flex>
            )}
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
