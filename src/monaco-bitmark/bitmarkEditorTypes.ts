// @awa-component: PLAN-017-BitmarkEditorTypes
//
// The parser's editor services (bitmark-parser PLAN-196) in LSP 3.17 shapes.
// Declared here rather than imported from `@gmb/bitmark-parser` so this
// branch type-checks against the PUBLISHED parser while it runs against a
// newer local engine; when the release that carries them lands, these
// aliases can be replaced by the package's own types field for field.

/** LSP `Position`: 0-based, `character` in `positionEncoding` units. */
export interface EditorPosition {
  line: number;
  character: number;
}

/** LSP `Range`: `start` inclusive, `end` exclusive. */
export interface EditorRange {
  start: EditorPosition;
  end: EditorPosition;
}

/** LSP `MarkupContent` — the parser always writes Markdown. */
export interface EditorMarkup {
  kind: 'markdown';
  value: string;
}

/** LSP `DiagnosticSeverity`. The parser never produces `Hint`. */
export const LspSeverity = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4,
} as const;

/** LSP `Diagnostic`. `code` is the parser's stable contract. */
export interface BitmarkDiagnostic {
  range: EditorRange;
  severity: number;
  code: string;
  source: string;
  message: string;
  data?: { bit: number };
}

/** What the parser's `diagnostics()` returns. */
export interface BitmarkDiagnostics {
  positionEncoding: string;
  diagnostics: BitmarkDiagnostic[];
}

/** LSP `CompletionItemKind` — the members the parser uses. */
export const LspCompletionKind = {
  Class: 7,
  Property: 10,
  Value: 12,
  Keyword: 14,
  Snippet: 15,
  EnumMember: 20,
  TypeParameter: 25,
} as const;

/** LSP `CompletionItem`, the fields the parser fills. */
export interface BitmarkCompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: EditorMarkup;
  /** `[1]` (Deprecated) on a deprecated bit or tag. */
  tags?: number[];
  preselect?: boolean;
  sortText: string;
  insertText: string;
  data?: unknown;
}

/** LSP `CompletionList`, plus the parser's `context` extension field. */
export interface BitmarkCompletionList {
  isIncomplete: boolean;
  items: BitmarkCompletionItem[];
  context?: { bit?: string; scope: string; chainParent?: string };
}

/** LSP `Hover`, plus the parser's `data` extension field. */
export interface BitmarkHover {
  range: EditorRange;
  contents: EditorMarkup;
  data?: unknown;
}

export type DiagnosticsSource = (
  input: string,
  options?: { positionEncoding?: string },
) => BitmarkDiagnostics;

export type CompleteSource = (
  input: string,
  position: EditorPosition,
  options?: { positionEncoding?: string; includeDeprecated?: boolean },
) => BitmarkCompletionList;

export type HoverSource = (
  input: string,
  position: EditorPosition,
  options?: { positionEncoding?: string },
) => BitmarkHover | null;
