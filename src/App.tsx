/** @jsxImportSource theme-ui */
import { Flex, ThemeUIProvider } from 'theme-ui';

import { BitmarkConverterProvider } from './components/bitmark/BitmarkConverter';
import { BitmarkJsonTextBox } from './components/bitmark/BitmarkJsonTextBox';
import { BitmarkMarkupTextBox } from './components/bitmark/BitmarkMarkupTextBox';
import { BitmarkParserGeneratorProvider } from './components/bitmark/BitmarkParserGenerator';
import { theme } from './theme/theme';
import './App.css';

function App() {
  return (
    <ThemeUIProvider theme={theme}>
      <BitmarkParserGeneratorProvider>
        <BitmarkConverterProvider>
          <Flex
            sx={{
              alignItems: 'center',
            }}
          >
            <BitmarkMarkupTextBox initialMarkup="[.article] Hello World!" />
            <BitmarkJsonTextBox />
          </Flex>
        </BitmarkConverterProvider>
      </BitmarkParserGeneratorProvider>
    </ThemeUIProvider>
  );
}

export { App };
