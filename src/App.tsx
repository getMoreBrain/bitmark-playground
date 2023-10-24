/** @jsxImportSource theme-ui */
import { Flex, Text, ThemeUIProvider } from 'theme-ui';

import { BitmarkJsonDuration } from './components/bitmark/BitmarkJsonDuration';
import { BitmarkJsonTextBox } from './components/bitmark/BitmarkJsonTextBox';
import { BitmarkMarkupDuration } from './components/bitmark/BitmarkMarkupDuration';
import { BitmarkMarkupTextBox } from './components/bitmark/BitmarkMarkupTextBox';
import { Copyright } from './components/version/Copyright';
import { Version } from './components/version/Version';
import { BitmarkParserGeneratorProvider } from './services/BitmarkParserGenerator';
import { theme } from './theme/theme';
import './App.css';

function App() {
  return (
    <ThemeUIProvider theme={theme}>
      <BitmarkParserGeneratorProvider>
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
              <Flex
                sx={{
                  alignItems: 'flex-end',
                }}
              >
                <Text
                  sx={{
                    variant: 'header.code',
                  }}
                >
                  bitmark
                </Text>
                <BitmarkMarkupDuration
                  sx={{
                    variant: 'text.parserDuration',
                  }}
                />
              </Flex>
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
                  initialMarkup="[.article] Hello World!"
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
              <Flex
                sx={{
                  alignItems: 'flex-end',
                }}
              >
                <Text
                  sx={{
                    variant: 'header.code',
                  }}
                >
                  JSON
                </Text>
                <BitmarkJsonDuration
                  sx={{
                    variant: 'text.parserDuration',
                  }}
                />
              </Flex>
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
      </BitmarkParserGeneratorProvider>
    </ThemeUIProvider>
  );
}

export { App };
