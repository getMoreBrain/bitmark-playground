// @awa-component: PLAN-023-MonacoServices
import type * as MonacoApi from 'monaco-editor';

/** The Monaco namespace the host injects (PLAN-022 D8): ESM import, AMD global or `/bundled`. */
export type Monaco = typeof MonacoApi;
export type CodeEditor = MonacoApi.editor.ICodeEditor;
export type TextModel = MonacoApi.editor.ITextModel;
export type IDisposable = MonacoApi.IDisposable;
