/**
 * PLAN-022 Phase 0 prototype core. Throwaway: it exists to prove the
 * injection and build decisions (D4, D8, D12) before Phase 1, not to be
 * the package. It never imports `monaco-editor` at runtime (D8).
 */
import type * as MonacoNs from 'monaco-editor';

import { jsonWithBitStarts } from '../../src/json/jsonText';
import { mapScrollTop } from '../../src/scroll/mapScrollTop';
import { buildBitmarkHighlightCss, tokenClassName } from '../../src/theme/tokens';

export type Monaco = typeof MonacoNs;

/** The parser functions the prototype uses (a raw `@gmb/bitmark-parser` module fits). */
export interface Engine {
  version(): string;
  bitmarkToObjects(input: string, options?: { mode?: string }): unknown;
  convert(input: string, options?: Record<string, unknown>): string;
  semanticTokens(input: string, options?: Record<string, unknown>): {
    layout: string;
    tokens: { line: number; start: number; length: number; type: string; modifiers: string[] }[];
  };
  diagnostics?(input: string, options?: Record<string, unknown>): {
    diagnostics: {
      range: { start: { line: number; character: number }; end: { line: number; character: number } };
      severity: number;
      message: string;
      code: string;
    }[];
  };
  complete?(
    input: string,
    position: { line: number; character: number },
    options?: Record<string, unknown>,
  ): { isIncomplete: boolean; items: { label: string; insertText: string; insertTextFormat?: number; detail?: string; sortText?: string }[] };
  hover?(
    input: string,
    position: { line: number; character: number },
  ): { contents: { value: string } } | null;
  splitBits?(input: string): { start?: number }[];
}

/** Load the parser (D2 load path) and run the two-stage init (D7). */
export const loadEngine = async (url: string, onFull?: () => void): Promise<Engine> => {
  const module = (await import(/* @vite-ignore */ url)) as Engine & {
    init(o: { feature: string }): Promise<void>;
  };
  await module.init({ feature: 'bitmark-json' });
  void module.init({ feature: 'full' }).then(() => onFull?.());
  return module;
};

export const LANGUAGE_ID = 'bitmark';
/** Every model the prototype creates lives under this scheme (D5). */
export const SCHEME = 'bitmark-editor';

const engines = new WeakMap<MonacoNs.editor.ITextModel, Engine>();
const setUp = new WeakSet<object>();

const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

/** Register the language, the token stylesheet and the providers on THIS Monaco (idempotent). */
export const setupBitmarkMonaco = (monaco: Monaco): void => {
  if (setUp.has(monaco)) return;
  setUp.add(monaco);
  if (!monaco.languages.getLanguages().some((l) => l.id === LANGUAGE_ID)) {
    monaco.languages.register({ id: LANGUAGE_ID });
  }
  if (!document.querySelector('style[data-bitmark-highlight]')) {
    const style = document.createElement('style');
    style.setAttribute('data-bitmark-highlight', '');
    style.textContent = buildBitmarkHighlightCss();
    document.head.appendChild(style);
  }
  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ['[', '.', '@', '&', ':', '|', '=', '-'],
    provideCompletionItems: (model, position, context) => {
      const engine = engines.get(model);
      if (!engine?.complete) return { suggestions: [] };
      const list = engine.complete(
        model.getValue(),
        { line: position.lineNumber - 1, character: position.column - 1 },
        {
          triggerCharacter:
            context.triggerKind === monaco.languages.CompletionTriggerKind.TriggerCharacter
              ? context.triggerCharacter
              : undefined,
        },
      );
      const word = model.getWordUntilPosition(position);
      return {
        incomplete: list.isIncomplete,
        suggestions: list.items.map((i) => ({
          label: i.label,
          kind: monaco.languages.CompletionItemKind.Property,
          detail: i.detail,
          sortText: i.sortText,
          insertText: i.insertText,
          insertTextRules:
            i.insertTextFormat === 2
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: position.column,
          },
        })),
      };
    },
  });
  monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover: (model, position) => {
      const engine = engines.get(model);
      const hover = engine?.hover?.(model.getValue(), {
        line: position.lineNumber - 1,
        character: position.column - 1,
      });
      return hover ? { contents: [{ value: hover.contents.value }] } : null;
    },
  });
};

/** Bind the JSON schema to the prototype's JSON models only (D5). */
export const setJsonSchema = (monaco: Monaco, schema: unknown): boolean => {
  const json = (monaco.languages as { json?: { jsonDefaults?: MonacoNs.languages.json.LanguageServiceDefaults } }).json;
  if (!json?.jsonDefaults) return false;
  json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [{ uri: 'https://getmorebrain.github.io/bitmark/bitmark.schema.json', fileMatch: [`${SCHEME}://**`], schema }],
  });
  return true;
};

export interface PairOptions {
  monaco: Monaco;
  engine: Engine;
  bitmarkElement: HTMLElement;
  jsonElement: HTMLElement;
  value: string;
  theme?: string;
  /** Applied to Monaco only when the prototype owns it (D11). */
  applyMonacoTheme?: boolean;
}

let pairSeq = 0;

/** A bitmark pane and a JSON pane, converting both ways, highlighted, validated and scroll-linked. */
export const createPair = (opts: PairOptions) => {
  const { monaco, engine } = opts;
  setupBitmarkMonaco(monaco);
  const id = ++pairSeq;
  const bitmarkModel = monaco.editor.createModel(
    opts.value,
    LANGUAGE_ID,
    monaco.Uri.parse(`${SCHEME}://pair-${id}/document.bitmark`),
  );
  const jsonModel = monaco.editor.createModel('', 'json', monaco.Uri.parse(`${SCHEME}://pair-${id}/document.json`));
  engines.set(bitmarkModel, engine);

  const common: MonacoNs.editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    wordWrap: 'on',
    minimap: { enabled: false },
    ...(opts.applyMonacoTheme ? { theme: opts.theme ?? 'vs-dark' } : {}),
  };
  const bitmarkEditor = monaco.editor.create(opts.bitmarkElement, {
    ...common,
    model: bitmarkModel,
    quickSuggestions: false,
    renderWhitespace: 'all',
  });
  const jsonEditor = monaco.editor.create(opts.jsonElement, { ...common, model: jsonModel });

  // Highlighting and diagnostics from the parser.
  const decorations = bitmarkEditor.createDecorationsCollection();
  const highlight = () => {
    const r = engine.semanticTokens(bitmarkModel.getValue(), { tokensLayout: 'absolute', positionEncoding: 'utf-16' });
    decorations.set(
      r.tokens.map((t) => ({
        range: new monaco.Range(t.line + 1, t.start + 1, t.line + 1, t.start + t.length + 1),
        options: { inlineClassName: tokenClassName(t.type, t.modifiers) },
      })),
    );
  };
  const validate = () => {
    if (!engine.diagnostics) return;
    const r = engine.diagnostics(bitmarkModel.getValue(), { positionEncoding: 'utf-16' });
    monaco.editor.setModelMarkers(
      bitmarkModel,
      'bitmark',
      r.diagnostics.map((d) => ({
        severity: d.severity === 1 ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        message: d.message,
        code: d.code,
        startLineNumber: d.range.start.line + 1,
        startColumn: d.range.start.character + 1,
        endLineNumber: d.range.end.line + 1,
        endColumn: Math.max(d.range.end.character + 1, d.range.start.character + 2),
      })),
    );
  };

  // Conversion both ways; the edited side is never written back (D9).
  let applying = false;
  const jsonStarts = jsonEditor.createDecorationsCollection();
  const write = (model: MonacoNs.editor.ITextModel, text: string) => {
    applying = true;
    try {
      // Full-range edit, not setValue: undo survives (D16).
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
    } finally {
      applying = false;
    }
  };
  const bitmarkToJson = () => {
    try {
      const bits = engine.bitmarkToObjects(bitmarkModel.getValue(), { mode: 'optimized' }) as unknown[];
      const { text, bitStarts } = jsonWithBitStarts(bits);
      write(jsonModel, text);
      jsonStarts.set(
        bitStarts.map((o) => {
          const p = jsonModel.getPositionAt(o);
          return {
            range: new monaco.Range(p.lineNumber, p.column, p.lineNumber, p.column),
            options: { stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges },
          };
        }),
      );
    } catch (e) {
      console.warn('bitmark -> json failed', e);
    }
  };
  const jsonToBitmark = () => {
    try {
      JSON.parse(jsonModel.getValue());
      const out = engine.convert(jsonModel.getValue(), { inputFormat: 'json', outputFormat: 'bitmark' });
      if (out.startsWith('error:')) throw new Error(out);
      write(bitmarkModel, out);
    } catch (e) {
      console.warn('json -> bitmark failed', e);
    }
  };

  const onBitmark = debounce(() => {
    highlight();
    validate();
  }, 15);
  const subs = [
    bitmarkModel.onDidChangeContent(() => {
      onBitmark();
      if (!applying) bitmarkToJson();
    }),
    jsonModel.onDidChangeContent(() => {
      if (!applying) jsonToBitmark();
    }),
  ];

  // Scroll sync by bit (PLAN-018 rules, two members).
  const bitmarkTops = () =>
    (engine.splitBits?.(bitmarkModel.getValue()) ?? [])
      .map((s) => s.start)
      .filter((s): s is number => typeof s === 'number')
      .map((o) => {
        const p = bitmarkModel.getPositionAt(o);
        return bitmarkEditor.getTopForPosition(p.lineNumber, p.column);
      });
  const jsonTops = () =>
    jsonStarts.getRanges().map((r) => jsonEditor.getTopForPosition(r.startLineNumber, r.startColumn));
  const geometry = (ed: MonacoNs.editor.IStandaloneCodeEditor, tops: number[]) => ({
    bitTops: tops,
    maxScrollTop: ed.getScrollHeight() - ed.getLayoutInfo().height,
  });
  let syncing = false;
  const follow = (leader: 'bitmark' | 'json') => {
    const [src, dst, sTops, dTops] =
      leader === 'bitmark'
        ? [bitmarkEditor, jsonEditor, bitmarkTops(), jsonTops()]
        : [jsonEditor, bitmarkEditor, jsonTops(), bitmarkTops()];
    syncing = true;
    try {
      dst.setScrollTop(mapScrollTop(geometry(src, sTops), geometry(dst, dTops), src.getScrollTop()));
    } finally {
      syncing = false;
    }
  };
  subs.push(
    bitmarkEditor.onDidScrollChange((e) => e.scrollTopChanged && !syncing && follow('bitmark')),
    jsonEditor.onDidScrollChange((e) => e.scrollTopChanged && !syncing && follow('json')),
  );

  highlight();
  validate();
  bitmarkToJson();

  return {
    bitmarkEditor,
    jsonEditor,
    getBitmark: () => bitmarkModel.getValue(),
    getJson: () => jsonModel.getValue(),
    dispose: () => {
      for (const s of subs) s.dispose();
      bitmarkEditor.dispose();
      jsonEditor.dispose();
      bitmarkModel.dispose();
      jsonModel.dispose();
    },
  };
};
