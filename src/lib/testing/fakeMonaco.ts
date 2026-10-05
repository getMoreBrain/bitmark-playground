// Test doubles for the injected Monaco (PLAN-020 D8). Only what src/lib uses.
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
  setText(text: string): void;
}

let modelSeq = 0;

/** A text model: value, version, URI. `setText` is a user edit (version + 1). */
export const createFakeModel = (text: string, uri = `inmemory://model/${++modelSeq}`): FakeModel => {
  let value = text;
  let version = 1;
  const change = emitter();
  const model = {
    uri: { toString: () => uri },
    getValue: () => value,
    getVersionId: () => version,
    getValueInRange: (r: FakeRange) => {
      const line = value.split('\n')[r.startLineNumber - 1] ?? '';
      return line.slice(r.startColumn - 1, r.endColumn - 1);
    },
    onDidChangeContent: change.on,
    setText: (next: string) => {
      value = next;
      version++;
      change.fire();
    },
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
  const monaco = {
    Range: FakeRange,
    MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
    editor: {
      getModels: () => models,
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
    providers,
    setDiagnosticsOptions,
    setTheme,
    /** The markers `owner` set on `model`. */
    markersOf: (model: TextModel, owner = 'bitmark') =>
      (markers.get(model) ?? []).find((m) => m.owner === owner)?.markers ?? [],
  };
};

/** An editor over a fake model: content/model events and a decorations collection. */
export const createFakeEditor = (model: FakeModel, contributions: string[] = ['editor.contrib.suggestController', 'editor.contrib.contentHover']) => {
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
