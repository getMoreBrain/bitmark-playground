// Mock monaco-editor for test environment
export const editor = {
  create: () => ({
    dispose: () => {},
    getValue: () => '',
    setValue: () => {},
    onDidChangeModelContent: () => ({ dispose: () => {} }),
    getModel: () => null,
    updateOptions: () => {},
    layout: () => {},
  }),
  defineTheme: () => {},
  setTheme: () => {},
  createModel: () => ({
    dispose: () => {},
    getValue: () => '',
    setValue: () => {},
  }),
};

export const languages = {
  register: () => {},
  registerCompletionItemProvider: () => ({ dispose: () => {} }),
  setMonarchTokensProvider: () => ({ dispose: () => {} }),
  setLanguageConfiguration: () => ({ dispose: () => {} }),
};

export const Uri = {
  parse: (uri: string) => ({ toString: () => uri }),
};

export const KeyMod = {};
export const KeyCode = {};
export const Range = class {};
export const Selection = class {};
export const Position = class {};
