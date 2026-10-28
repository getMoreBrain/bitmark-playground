/** @jsxImportSource theme-ui */
import './App.css';

import { Flex, ThemeUIProvider } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { BitmarkJsonTextBox } from './components/bitmark/BitmarkJsonTextBox';
import { BitmarkMarkupTextBox } from './components/bitmark/BitmarkMarkupTextBox';
import { FINAL_BITMARK_LABEL, FinalBitmarkTextBox } from './components/bitmark/DiffPanes';
import { HtmlPreview } from './components/bitmark/HtmlPreview';
import { LexerPanel } from './components/bitmark/LexerPanel';
import { OutputPanel } from './components/generic/ui/OutputPanel';
import { ResizableLayout } from './components/generic/ui/ResizableLayout';
import { SettingsMenu } from './components/generic/ui/SettingsMenu';
import { TabBar } from './components/generic/ui/TabBar';
import { SearchBar } from './components/search/SearchBar';
import { Copyright } from './components/version/Copyright';
import { Version } from './components/version/Version';
import { BitmarkParserProvider } from './services/BitmarkParser';
import { BitmarkParserGeneratorProvider } from './services/BitmarkParserGenerator';
import { DiffSyncProvider } from './services/DiffSyncProvider';
import { PlaygroundSession, SessionPaneTab } from './session/PlaygroundSession';
import {
  bitmarkState,
  JSON_TAB_LABEL,
  jsonTabs,
  JsonTabType,
  MARKUP_TAB_LABEL,
  markupTabs,
  tabParser,
} from './state/bitmarkState';
import { diffState } from './state/diffState';
import { OutputTab, uiState } from './state/uiState';
import { theme } from './theme/theme';
import { NARROW_MEDIA, STACKED_PANEL_SX, useNarrowLayout } from './utils/narrowLayout';

const initialMarkup = '[.p]\nHello (+bold)World(-bold)!';

const LEFT_OUTPUT_TABS: { id: OutputTab; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'mappings', label: 'Mappings' },
  { id: 'lexer', label: 'Lexer' },
];
const RIGHT_OUTPUT_TABS = [{ id: 'preview', label: 'Preview' }];

const EDITOR_OPTIONS = {
  wordWrap: 'on',
  // At its top or bottom, the editor lets the page scroll (PLAN-027 D7).
  scrollbar: { alwaysConsumeMouseWheel: false },
} as const;

function App() {
  const snap = useSnapshot(bitmarkState);
  const uiSnap = useSnapshot(uiState);
  const diffSnap = useSnapshot(diffState);
  const narrow = useNarrowLayout();

  const jsonTabDuration = (tab: JsonTabType): number | undefined =>
    tab === 'json' || tab === 'legacy'
      ? snap[tabParser(tab)].jsonDurationSec
      : tab === 'diff'
        ? diffSnap.diffDurationSec
        : snap.paneDurations[tab];

  // The top panels share the width equally (PLAN-032 D2).
  const panelWidth = uiSnap.showDiff ? '33.33%' : '50%';

  const editorPanels = (
    <Flex
      sx={{
        flexDirection: 'row',
        flexGrow: 1,
        minHeight: 0,
        // Same elements in both layouts: only the CSS changes (PLAN-027 D5).
        [NARROW_MEDIA]: { flexDirection: 'column', flexGrow: 0 },
      }}
    >
      <Flex
        sx={{
          flexDirection: 'column',
          flexGrow: 1,
          width: panelWidth,
          minHeight: 0,
          overflow: 'hidden',
          ...STACKED_PANEL_SX,
        }}
      >
        <Flex sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <TabBar
            tabs={markupTabs(uiSnap.showLegacy).map((tab) => ({
              id: tab,
              label: MARKUP_TAB_LABEL[tab],
              duration: snap[tabParser(tab)].markupDurationSec,
            }))}
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
            options={EDITOR_OPTIONS}
          />
        </Flex>
      </Flex>
      {/* Its slot stays in the tree: showing it does not remount the right panel. */}
      {uiSnap.showDiff ? (
        <Flex
          sx={{
            flexDirection: 'column',
            flexGrow: 1,
            width: panelWidth,
            minHeight: 0,
            overflow: 'hidden',
            ...STACKED_PANEL_SX,
          }}
        >
          <Flex sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <TabBar
              tabs={[
                { id: 'final', label: FINAL_BITMARK_LABEL, duration: diffSnap.finalDurationSec },
              ]}
              activeTab="final"
              onTabChange={() => {}}
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
            <FinalBitmarkTextBox
              className={'final-markup-editor'}
              sx={{
                border: '1px solid',
                borderColor: 'accent',
              }}
              options={EDITOR_OPTIONS}
            />
          </Flex>
        </Flex>
      ) : null}
      <Flex
        sx={{
          flexDirection: 'column',
          flexGrow: 1,
          width: panelWidth,
          minHeight: 0,
          overflow: 'hidden',
          ...STACKED_PANEL_SX,
        }}
      >
        <Flex sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <TabBar
            tabs={jsonTabs(uiSnap.showLegacy, uiSnap.showDiff).map((tab) => ({
              id: tab,
              label: JSON_TAB_LABEL[tab],
              duration: jsonTabDuration(tab),
            }))}
            activeTab={snap.activeJsonTab}
            onTabChange={(tab) => bitmarkState.setActiveJsonTab(tab)}
          />
          <Flex sx={{ flexGrow: 1 }} />
          {/* Pinned: the tabs scroll, the cog does not (PLAN-027 D6). */}
          <Flex sx={{ flexShrink: 0, alignSelf: 'stretch' }}>
            <SettingsMenu />
          </Flex>
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
            options={EDITOR_OPTIONS}
          />
        </Flex>
      </Flex>
    </Flex>
  );

  const bottomPanels = (
    <Flex
      sx={{
        flexDirection: 'row',
        flexGrow: 1,
        minHeight: 0,
        [NARROW_MEDIA]: { flexDirection: 'column' },
      }}
    >
      <OutputPanel
        tabs={LEFT_OUTPUT_TABS}
        activeTab={uiSnap.leftOutputTab}
        onTabChange={(tab) => uiState.setLeftOutputTab(tab)}
      >
        {uiSnap.leftOutputTab === 'info' ? <SessionPaneTab tab="info" /> : null}
        {uiSnap.leftOutputTab === 'mappings' ? <SessionPaneTab tab="mappings" /> : null}
        {uiSnap.leftOutputTab === 'lexer' ? <LexerPanel /> : null}
      </OutputPanel>
      <OutputPanel tabs={RIGHT_OUTPUT_TABS} activeTab="preview" onTabChange={() => {}}>
        <HtmlPreview />
      </OutputPanel>
    </Flex>
  );

  return (
    <ThemeUIProvider theme={theme}>
      <BitmarkParserGeneratorProvider>
        <BitmarkParserProvider>
          <PlaygroundSession>
            <DiffSyncProvider>
              <Flex
                sx={{
                  flexDirection: 'column',
                  height: '100vh',
                  width: '100%',
                  backgroundColor: 'background',
                  // Stacked: the page scrolls between the panels (PLAN-027 D3).
                  [NARROW_MEDIA]: { height: 'auto', minHeight: '100vh' },
                }}
              >
                <SearchBar />
                {/* Always render ResizableLayout so the editor panels keep a stable
                tree position — toggling the bottom panels must not remount the
                editors (which would reset their content). */}
                <ResizableLayout
                  top={editorPanels}
                  bottom={bottomPanels}
                  showBottom={uiSnap.showBottomPanels}
                  stacked={narrow}
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
                    flexWrap: 'wrap',
                    columnGap: 3,
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
            </DiffSyncProvider>
          </PlaygroundSession>
        </BitmarkParserProvider>
      </BitmarkParserGeneratorProvider>
    </ThemeUIProvider>
  );
}

export { App };
