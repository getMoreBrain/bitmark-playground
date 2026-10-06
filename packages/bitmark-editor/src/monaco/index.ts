export type { AttachBitmarkEditorOptions, BitmarkEditorServices } from './attach';
export { attachBitmarkEditor } from './attach';
export type { BitmarkSuggestion, CompletionQuery } from './completion';
export {
  COMPLETE_OPTIONS,
  COMPLETION_TRIGGER_CHARACTERS,
  monacoKind,
  replacedPrefixLength,
  replacedSuffixLength,
  toMonacoSuggestion,
  triggerCharacterOf,
} from './completion';
export {
  attachBitmarkDiagnostics,
  BITMARK_MARKER_OWNER,
  buildBitmarkMarkers,
  DIAGNOSTICS_DEBOUNCE_MS,
  markerSeverity,
} from './diagnostics';
export {
  attachBitmarkHighlighter,
  buildBitmarkDecorations,
  HIGHLIGHT_DEBOUNCE_MS,
} from './highlighter';
export {
  bindBitmarkJsonSchema,
  BITMARK_MODEL_FILE_MATCH,
  BITMARK_MODEL_SCHEME,
  BITMARK_SCHEMA_URI,
  loadBitmarkJsonSchema,
  schemaUrlFor,
  schemaUrlForVersion,
} from './jsonSchema';
export type { SetupBitmarkMonacoOptions } from './setup';
export {
  bindModelEngine,
  BITMARK_LANGUAGE_CONFIGURATION,
  BITMARK_LANGUAGE_ID,
  engineForModel,
  setupBitmarkMonaco,
  toMonacoHover,
} from './setup';
export type { CodeEditor, IDisposable, Monaco, TextModel } from './types';
