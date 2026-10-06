// Test doubles for the injected Monaco (PLAN-022 D8). Only what src/lib uses.
import { vi } from 'vitest';

import type { CodeEditor, Monaco, TextModel } from '../monaco/types';

export class FakeRange {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number,
  ) {}
}

type Listener<T = void> = (e: T) => void;
const emitter = <T = void>() => {
  const listeners = new Set<Listener<T>>();
  return {
    on: (cb: Listener<T>) => {
      listeners.add(cb);
      return { dispose: () => listeners.delete(cb) };
    },
    fire: (e: T) => [...listeners].forEach((l) => l(e)),
    count: () => listeners.size,
  };
};

export interface FakeModel extends TextModel {
  /** A user edit (one undo step). */
  setText(text: string): void;
  /** Monaco's undo: back to the text before the last edit. */
  undo(): void;
  disposed: boolean;
}

let modelSeq = 0;

/** A text model: value, version, URI. `setText` is a user edit (version + 1). */
export const createFakeModel = (
  text: string,
  uri = `inmemory://model/${++modelSeq}`,
): FakeModel => {
  let value = text;
  let version = 1;
  const history: string[] = [];
  const change = emitter();
  const edit = (next: string) => {
    history.push(value);
    value = next;
    version++;
    change.fire();
  };
  const model = {
    uri: { toString: () => uri },
    disposed: false,
    getValue: () => value,
    getVersionId: () => version,
    getFullModelRange: () => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }),
    pushStackElement: () => {},
    pushEditOperations: (_sel: unknown, ops: { text: string }[]) => edit(ops[0]!.text),
    /** Like Monaco's: replaces the text and drops the undo history. */
    setValue: (next: string) => {
      history.length = 0;
      value = next;
      version++;
      change.fire();
    },
    undo: () => {
      const prev = history.pop();
      if (prev === undefined) return;
      value = prev;
      version++;
      change.fire();
    },
    dispose: () => {
      model.disposed = true;
    },
    getPositionAt: (offset: number) => {
      const before = value.slice(0, offset).split('\n');
      return { lineNumber: before.length, column: before[before.length - 1]!.length + 1 };
    },
    getOffsetAt: ({ lineNumber, column }: { lineNumber: number; column: number }) => {
      const lines = value.split('\n');
      let offset = 0;
      for (let i = 0; i < lineNumber - 1; i++) offset += lines[i]!.length + 1;
      return offset + column - 1;
    },
    getLineMaxColumn: (line: number) => (value.split('\n')[line - 1]?.length ?? 0) + 1,
    getValueInRange: (r: FakeRange) => {
      const line = value.split('\n')[r.startLineNumber - 1] ?? '';
      return line.slice(r.startColumn - 1, r.endColumn - 1);
    },
    onDidChangeContent: change.on,
    setText: (next: string) => edit(next),
  };
  return model as unknown as FakeModel;
};

/** A Monaco namespace double; providers registered on it are captured. */
export const createFakeMonaco = () => {
  const models: TextModel[] = [];
  const markers = new Map<TextModel, { owner: string; markers: unknown[] }[]>();
  const providers = {
    completion: [] as { language: string; provider: Record<string, (...a: never[]) => unknown> }[],
    hover: [] as { language: string; provider: Record<string, (...a: never[]) => unknown> }[],
  };
  const languages: { id: string }[] = [];
  const setDiagnosticsOptions = vi.fn();
  const setTheme = vi.fn();
  const setLanguageConfiguration = vi.fn();
  const editors: {
    focused: boolean;
    options: Record<string, unknown>;
    disposed: boolean;
    scrollTop: number;
    decorations: unknown[];
    blur: () => void;
  }[] = [];
  const monaco = {
    Range: FakeRange,
    Uri: { parse: (u: string) => ({ toString: () => u }) },
    MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
    editor: {
      getModels: () => models,
      createModel: (value: string, _language: string, uri?: { toString(): string }) => {
        const model = createFakeModel(value, uri?.toString());
        models.push(model);
        return model;
      },
      create: (_element: unknown, options: Record<string, unknown>) => {
        const state = {
          focused: false,
          options: { ...options },
          disposed: false,
          scrollTop: 0,
          decorations: [] as unknown[],
          /** The user leaves the editor. */
          blur: () => {},
        };
        editors.push(state);
        const model = options['model'] as FakeModel;
        const noop = () => ({ dispose: () => {} });
        const scroll = emitter<{ scrollTopChanged: boolean; scrollHeightChanged: boolean }>();
        const blur = emitter();
        state.blur = () => {
          state.focused = false;
          blur.fire();
        };
        return {
          getModel: () => model,
          hasTextFocus: () => state.focused,
          updateOptions: (o: Record<string, unknown>) => Object.assign(state.options, o),
          layout: vi.fn(),
          dispose: () => {
            state.disposed = true;
          },
          onDidChangeModelContent: (cb: () => void) => model.onDidChangeContent(cb),
          onDidChangeModel: noop,
          onDidContentSizeChange: noop,
          onDidLayoutChange: noop,
          onDidScrollChange: scroll.on,
          onDidBlurEditorText: blur.on,
          getContribution: () => ({}),
          createDecorationsCollection: () => {
            let ranges: { range: FakeRange }[] = [];
            return {
              set: (d: { range: FakeRange }[]) => {
                ranges = d;
                state.decorations = d;
              },
              clear: () => {
                ranges = [];
                state.decorations = [];
              },
              getRanges: () => ranges.map((r) => r.range),
            };
          },
          getScrollTop: () => state.scrollTop,
          setScrollTop: (top: number) => {
            state.scrollTop = top;
            scroll.fire({ scrollTopChanged: true, scrollHeightChanged: false });
          },
          getScrollHeight: () => model.getValue().split('\n').length * 10,
          getLayoutInfo: () => ({ height: 50 }),
          getTopForPosition: (line: number) => (line - 1) * 10,
        };
      },
      setModelMarkers: (model: TextModel, owner: string, m: unknown[]) => {
        const list = (markers.get(model) ?? []).filter((x) => x.owner !== owner);
        markers.set(model, [...list, { owner, markers: m }]);
      },
      setTheme,
      TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 },
    },
    languages: {
      getLanguages: () => languages,
      register: (l: { id: string }) => languages.push(l),
      setLanguageConfiguration,
      registerCompletionItemProvider: (language: string, provider: never) => {
        providers.completion.push({ language, provider });
        return { dispose: () => {} };
      },
      registerHoverProvider: (language: string, provider: never) => {
        providers.hover.push({ language, provider });
        return { dispose: () => {} };
      },
      CompletionItemKind: {
        Class: 5,
        Property: 9,
        Value: 13,
        Keyword: 17,
        Snippet: 27,
        EnumMember: 16,
        TypeParameter: 24,
      },
      CompletionItemTag: { Deprecated: 1 },
      CompletionItemInsertTextRule: { None: 0, KeepWhitespace: 1, InsertAsSnippet: 4 },
      CompletionTriggerKind: { Invoke: 0, TriggerCharacter: 1, TriggerForIncompleteCompletions: 2 },
      json: { jsonDefaults: { setDiagnosticsOptions } },
    },
  };
  return {
    monaco: monaco as unknown as Monaco,
    models,
    /** The editors created, with their focus flag and options. */
    editors,
    providers,
    setDiagnosticsOptions,
    setTheme,
    setLanguageConfiguration,
    /** The markers `owner` set on `model`. */
    markersOf: (model: TextModel, owner = 'bitmark') =>
      (markers.get(model) ?? []).find((m) => m.owner === owner)?.markers ?? [],
  };
};

/** An editor over a fake model: content/model events and a decorations collection. */
export const createFakeEditor = (
  model: FakeModel,
  contributions: string[] = ['editor.contrib.suggestController', 'editor.contrib.contentHover'],
) => {
  let current: TextModel | null = model;
  let decorations: { range: FakeRange; options: { inlineClassName?: string } }[] = [];
  const contentChange = emitter();
  const modelChange = emitter();
  model.onDidChangeContent(() => contentChange.fire());
  const editor = {
    getModel: () => current,
    onDidChangeModelContent: contentChange.on,
    onDidChangeModel: modelChange.on,
    createDecorationsCollection: () => ({
      set: (d: typeof decorations) => {
        decorations = d;
      },
      clear: () => {
        decorations = [];
      },
    }),
    getContribution: (id: string) => (contributions.includes(id) ? {} : null),
  };
  return {
    editor: editor as unknown as CodeEditor,
    decorations: () => decorations,
    classes: () => decorations.map((d) => d.options.inlineClassName),
    listenerCount: () => contentChange.count() + modelChange.count(),
    swapModel: (next: TextModel | null) => {
      current = next;
      modelChange.fire();
    },
  };
};
