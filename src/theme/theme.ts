import { merge, type Theme, type ThemeUIStyleObject } from 'theme-ui';

interface ThemeVariants {
  header: {
    code: ThemeUIStyleObject;
  };
  text: {
    parserDuration: ThemeUIStyleObject;
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
    backgroundLight: '#1F1F1F',
    primary: '#7dc13a',
    secondary: '#0f9f9f9',
    accent: '#63019B',
    muted: '#888',
  },
  forms: {
    textarea: {
      borderColor: 'accent',
      '&:focus': {
        // borderColor: 'primary',
        backgroundColor: 'backgroundLight',
        outline: 'none',
      },
      /* Scrollbar on Firefox */
      'scrollbar-width': 'thin' /* "auto" or "thin" */,
    },
  },
  styles: {
    root: {
      /* Scrollbar on Chrome, Edge, and Safari */
      '*::-webkit-scrollbar': {
        width: 10 /* width of the entire scrollbar */,
      },
      '*::-webkit-scrollbar-track': {
        background: 'accent' /* color of the tracking area */,
      },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: 'primary' /* color of the scroll thumb */,
        borderRadius: '20px' /* roundness of the scroll thumb */,
        border: '2px solid' /* creates padding around scroll thumb */,
        borderColor: 'accent',
      },
      /* Scrollbar on Firefox */
      // Does not work here, apply directly 'scrollbar-width': 'thin' /* "auto" or "thin" */,
      'scrollbar-color': '#7dc13a #63019B' /* scroll thumb and track */,
    },
  },
};

const themeVariants: ThemeVariants = {
  header: {
    code: {
      color: 'primary',
      fontSize: 3,
      // fontWeight: 500,
      margin: 2,
    },
  },
  text: {
    parserDuration: {
      color: 'muted',
      fontSize: 1,
      margin: 2,
    },
    copyright: {
      color: 'muted',
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
