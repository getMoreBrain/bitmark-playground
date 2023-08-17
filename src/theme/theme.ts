import { merge, type Theme, type ThemeUIStyleObject } from 'theme-ui';

interface ThemeVariants {
  text: {
    copyright: ThemeUIStyleObject;
  };
  textarea: {
    code: ThemeUIStyleObject;
  };
}

const themeDefaults: Theme = {
  fonts: {
    body: 'system-ui, sans-serif',
    heading: '"Avenir Next", sans-serif',
    monospace: 'Menlo, monospace',
    code: "'Cascadia Mono-SemiLight', Menlo, Monaco, Consolas, monospace, 'Courier New'",
  },
  fontSizes: [11, 12, 14, 16, 20, 24, 32, 48, 64],
  colors: {
    text: '#FCFCFC',
    background: '#0F0F0F',
    primary: '#7dc13a',
    secondary: '#0f9f9f9',
    accent: '#63019B',
    muted: '#f6f6f6',
  },
  forms: {
    textarea: {
      borderColor: 'accent',
      '&:focus': {
        borderColor: 'primary',
        outline: 'none',
      },
    },
  },
};

const themeVariants: ThemeVariants = {
  text: {
    copyright: {
      color: 'primary',
      fontSize: 1,
      margin: 1,
    },
  },
  textarea: {
    code: {
      fontFamily: 'code',
      fontSize: 1,
    },
  },
};

const theme: Theme = merge(themeDefaults, themeVariants as Theme);

export { theme };
