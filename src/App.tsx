/** @jsxImportSource theme-ui */
import { Flex, ThemeUIProvider } from 'theme-ui';

import { BitmarkJsonTextBox } from './components/bitmark/BitmarkJsonTextBox';
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
            <BitmarkMarkupTextBox
              initialMarkup="[.article] Hello World!"
              sx={{
                resize: 'none',
                variant: 'textarea.code',
              }}
            />
            <BitmarkJsonTextBox sx={{ resize: 'none', variant: 'textarea.code' }} />
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
