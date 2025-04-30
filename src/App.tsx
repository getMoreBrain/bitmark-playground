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

const initialMarkup = '[.article] Hello World!';
// const initialMarkup = `
// [.article:bitmark++&video]

// Here is some inline 'style' applied **here is __the__ text** is this bold.
// Here is some __italic__ text ==the text==|test| is that correct **bold**

// [.article:bitmark++]
// Here is some inline 'style' applied ==here is the text==|bold|italic|subscript|, nice huh?

// **bold**

// [.image]
// [@id:304379]
// [@backgroundWallpaper:https://miro.medium.com/background.png]
// [&image:https://miro.medium.com/v2/resizefit1400/1nT_Rrk9LCI5XWiLGzzOzBQ*.gif][@search:testing **123**]

// [.image]
// [@id:304379]
// [@levelCEFRp:levelCEFRp]
// [@levelCEFR:levelCEFR]
// [@levelILR:levelILR]
// [@levelACTFL:levelACTFL]
// [&image:https://miro.medium.com/v2/resizefit1400/1nT_Rrk9LCI5XWiLGzzOzBQ$.gif][@zoomDisabled]

// [.article]

// [@ip:false]
// `.trim();

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
                  initialMarkup={initialMarkup}
                  options={{
                    wordWrap: 'on',
                    // bracketPairColorization: {
                    //   enabled: false,
                    //   independentColorPoolPerBracketType: false,
                    // },
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
      </BitmarkParserGeneratorProvider>
    </ThemeUIProvider>
  );
}

export { App };
