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
              <BitmarkMarkupTextBox
                initialMarkup="[.article] Hello World!"
                sx={{
                  resize: 'none',
                  variant: 'textarea.code',
                  flexGrow: 1,
                }}
              />
            </Flex>
            <Flex
              sx={{
                flexDirection: 'column',
                flexGrow: 1,
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
              <BitmarkJsonTextBox
                sx={{
                  resize: 'none',
                  variant: 'textarea.code',
                  flexGrow: 1,
                }}
              />
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
