// @zen-component: PLAN-002-App
/** @jsxImportSource theme-ui */
import { Flex, ThemeUIProvider } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { BitmarkJsonTextBox } from './components/bitmark/BitmarkJsonTextBox';
import { BitmarkMarkupTextBox } from './components/bitmark/BitmarkMarkupTextBox';
import { ParserTabBar } from './components/generic/ui/ParserTabBar';
import { Copyright } from './components/version/Copyright';
import { Version } from './components/version/Version';
import { BitmarkParserGeneratorProvider } from './services/BitmarkParserGenerator';
import { BitmarkParserProvider } from './services/BitmarkParser';
import { bitmarkState } from './state/bitmarkState';
import { theme } from './theme/theme';
import './App.css';

const initialMarkup = '[.article] Hello World!';

// @zen-impl: PLAN-002-Step5 (tab bar integration)
// @zen-impl: PLAN-002-Step7 (provider nesting)
function App() {
  const snap = useSnapshot(bitmarkState);

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
            <Flex
              sx={{
                flexDirection: 'row',
                height: '100%',
              }}
            >
              <Flex
                sx={{
                  flexDirection: 'column',
                  flexGrow: 1,
                  width: '50%',
                }}
              >
                <ParserTabBar
                  label="bitmark"
                  jsDuration={snap.js.markupDurationSec}
                  wasmDuration={snap.wasm.markupDurationSec}
                  activeTab={snap.activeMarkupTab}
                  onTabChange={(tab) => bitmarkState.setActiveMarkupTab(tab)}
                />
                <Flex
                  sx={{
                    resize: 'none',
                    variant: 'textarea.code',
                    flexGrow: 1,
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
                }}
              >
                <ParserTabBar
                  label="JSON"
                  jsDuration={snap.js.jsonDurationSec}
                  wasmDuration={snap.wasm.jsonDurationSec}
                  activeTab={snap.activeJsonTab}
                  onTabChange={(tab) => bitmarkState.setActiveJsonTab(tab)}
                />
                <Flex
                  sx={{
                    resize: 'none',
                    variant: 'textarea.code',
                    flexGrow: 1,
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
            <Flex
              sx={{
                justifyContent: 'space-between',
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
