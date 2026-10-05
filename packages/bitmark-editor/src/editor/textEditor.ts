// @awa-component: PLAN-021-TextEditor
import type * as MonacoApi from 'monaco-editor';

import { BITMARK_MODEL_SCHEME } from '../monaco/jsonSchema';
import type { Monaco, TextModel } from '../monaco/types';

/**
 * Passes on only a value that differs from the last one the editor held
 * (reported, or set programmatically). Monaco can apply one input as many
 * edits and fire a content change for each after the batch, every one
 * reading the same final text: without this filter, each would re-run the
 * whole conversion pipeline.
 */
export const createChangeFilter = (initial: string) => {
  let last = initial;
  return {
    /** True, and remembered, when `next` differs from the last value. */
    changed: (next: string): boolean => {
      if (next === last) return false;
      last = next;
      return true;
    },
    /** The editor now holds `next` without it being reported (programmatic change). */
    set: (next: string): void => {
      last = next;
    },
  };
};

/**
 * Replace a model's whole text as one undoable edit, not `setValue`: the
 * pane's undo stack survives regeneration (PLAN-020 D16). The cursor is
 * clamped by Monaco; scroll is left where it was.
 */
// @awa-impl: PLAN-021-Step6 (regeneration keeps undo)
export const replaceAllKeepingUndo = (model: TextModel, text: string): void => {
  if (model.getValue() === text) return;
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
};

let editorSeq = 0;

/** A fresh model URI under the package scheme (PLAN-020 D5). */
export const createModelUri = (monaco: Monaco, kind: string, extension: string): MonacoApi.Uri =>
  monaco.Uri.parse(`${BITMARK_MODEL_SCHEME}://editor-${++editorSeq}/${kind}.${extension}`);

export interface TextEditorOptions {
  monaco: Monaco;
  value?: string;
  language: string;
  /** The model's file extension, so the schema scope and the language match. Default `txt`. */
  extension?: string;
  /** What the pane is (`bitmark`, `json`, …), for the model URI. */
  kind?: string;
  readOnly?: boolean;
  /** Passed to `monaco.editor.create`. */
  editorOptions?: MonacoApi.editor.IStandaloneEditorConstructionOptions;
  /** A user edit: the editor's new text (filtered: once per distinct value). */
  onInput?: (value: string) => void;
}

export interface TextEditor extends MonacoApi.IDisposable {
  readonly editor: MonacoApi.editor.IStandaloneCodeEditor;
  readonly model: TextModel;
  getValue(): string;
  /**
   * Show `text`, unless the user is typing here (the editor has focus): a
   * focused editor is never overwritten. Returns whether it was applied.
   */
  setValue(text: string): boolean;
  setReadOnly(readOnly: boolean): void;
  layout(): void;
}

/**
 * One Monaco editor on its own model, in plain TypeScript (PLAN-021 Step 6,
 * the behaviour of the playground's `MonacoTextArea`): user edits are
 * reported once per distinct value, a programmatic value never echoes back
 * as input, a focused editor is never overwritten, regeneration keeps undo,
 * and the editor lays itself out as its element resizes.
 */
// @awa-impl: PLAN-021-Step6 (createTextEditor)
export const createTextEditor = (element: HTMLElement, options: TextEditorOptions): TextEditor => {
  const { monaco } = options;
  const model = monaco.editor.createModel(
    options.value ?? '',
    options.language,
    createModelUri(monaco, options.kind ?? 'text', options.extension ?? 'txt'),
  );
  const editor = monaco.editor.create(element, {
    automaticLayout: true,
    ...options.editorOptions,
    model,
    readOnly: options.readOnly ?? options.editorOptions?.readOnly ?? false,
  });
  const filter = createChangeFilter(model.getValue());
  let programmatic = false;

  const listener = model.onDidChangeContent(() => {
    if (programmatic) return;
    const value = model.getValue();
    if (filter.changed(value)) options.onInput?.(value);
  });

  return {
    editor,
    model,
    getValue: () => model.getValue(),
    setValue: (text) => {
      if (editor.hasTextFocus()) return false;
      programmatic = true;
      try {
        replaceAllKeepingUndo(model, text);
      } finally {
        programmatic = false;
      }
      filter.set(text);
      return true;
    },
    setReadOnly: (readOnly) => editor.updateOptions({ readOnly }),
    layout: () => editor.layout(),
    dispose: () => {
      listener.dispose();
      editor.dispose();
      model.dispose();
    },
  };
};
