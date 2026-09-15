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
  // PLAN-017: markers from the parser's diagnostics.
  setModelMarkers: (..._args: unknown[]) => {},
};

/** Monaco's own values (`monaco.MarkerSeverity`). */
export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

export const languages = {
  register: () => {},
  registerCompletionItemProvider: () => ({ dispose: () => {} }),
  registerHoverProvider: () => ({ dispose: () => {} }),
  registerDocumentSemanticTokensProvider: () => ({ dispose: () => {} }),
  setMonarchTokensProvider: () => ({ dispose: () => {} }),
  setLanguageConfiguration: () => ({ dispose: () => {} }),
  /** Monaco's own values (`monaco.languages.CompletionItemKind`). */
  CompletionItemKind: {
    Method: 0,
    Function: 1,
    Constructor: 2,
    Field: 3,
    Variable: 4,
    Class: 5,
    Struct: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Event: 10,
    Operator: 11,
    Unit: 12,
    Value: 13,
    Constant: 14,
    Enum: 15,
    EnumMember: 16,
    Keyword: 17,
    Text: 18,
    Color: 19,
    File: 20,
    Reference: 21,
    Customcolor: 22,
    Folder: 23,
    TypeParameter: 24,
    User: 25,
    Issue: 26,
    Snippet: 27,
  },
  CompletionItemTag: { Deprecated: 1 },
  /** Monaco's own values (`monaco.languages.CompletionItemInsertTextRule`). */
  CompletionItemInsertTextRule: { None: 0, KeepWhitespace: 1, InsertAsSnippet: 4 },
  /** Monaco's own values (`monaco.languages.CompletionTriggerKind`). */
  CompletionTriggerKind: { Invoke: 0, TriggerCharacter: 1, TriggerForIncompleteCompletions: 2 },
  json: {
    jsonDefaults: {
      setDiagnosticsOptions: (..._args: unknown[]) => {},
    },
  },
};

export const Uri = {
  parse: (uri: string) => ({ toString: () => uri }),
};

export const KeyMod = {};
export const KeyCode = {};
export const Range = class {};
export const Selection = class {};
export const Position = class {};
