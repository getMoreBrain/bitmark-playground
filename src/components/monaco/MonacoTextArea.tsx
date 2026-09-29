/** @jsxImportSource theme-ui */

import { memo, useCallback, useEffect, useRef } from 'react';
import {
  EditorDidMount,
  EditorWillMount,
  EditorWillUnmount,
  monaco,
  MonacoEditorProps,
} from 'react-monaco-editor';

import { MonacoEditorAutoResize } from './MonacoEditorAutoResize';

export interface MonacoTextAreaUncontrolledProps extends MonacoEditorProps {
  value?: string;
  onInput?: (value: string) => void;
}

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

interface MonacoEditorRef {
  editor?: monaco.editor.IStandaloneCodeEditor;
  monaco?: typeof monaco;
  isProgrammaticChange?: boolean;
}

/**
 * A Monaco based textarea component.
 *
 * This component will NOT update when props have not changed, so value can be fed back to it via state without
 * causing unwanted renders. It will also not update when it has focus.
 */
const MonacoTextArea = memo((props: MonacoTextAreaUncontrolledProps) => {
  const {
    value,
    onInput,
    editorWillMount: editorWillMountOrig,
    editorDidMount: editorDidMountOrig,
    editorWillUnmount: editorWillUnmountOrig,
    ...restProps
  } = props;
  const ref = useRef<MonacoEditorRef>({});
  const changeFilter = useRef(createChangeFilter(value ?? ''));

  const editorWillMount = useCallback<EditorWillMount>(
    (monaco) => {
      ref.current.monaco = monaco;
      if (editorWillMountOrig) editorWillMountOrig(monaco);
    },
    [editorWillMountOrig],
  );

  const editorDidMount = useCallback<EditorDidMount>(
    (editor, monaco) => {
      ref.current.editor = editor;
      ref.current.monaco = monaco;

      if (editorDidMountOrig) editorDidMountOrig(editor, monaco);
    },
    [editorDidMountOrig],
  );

  const editorWillUnmount = useCallback<EditorWillUnmount>(
    (editor, monaco) => {
      ref.current.editor = undefined;
      ref.current.monaco = undefined;
      if (editorWillUnmountOrig) editorWillUnmountOrig(editor, monaco);
    },
    [editorWillUnmountOrig],
  );

  /* Register the textarea input change handler */
  useEffect(() => {
    if (!ref.current || !ref.current.editor) return;
    const monacoEditor = ref.current.editor;

    const onDidChangeModelContent = () => {
      if (ref.current.isProgrammaticChange) return;
      const value = monacoEditor.getValue() ?? ''; // monacoRef.value ?? '';
      if (!changeFilter.current.changed(value)) return;
      if (onInput) onInput(value);
    };

    const disposable = monacoEditor.onDidChangeModelContent(onDidChangeModelContent);

    return () => {
      disposable.dispose();
    };
  }, [ref.current.editor, onInput]);

  // Update the value if this text box does not have focus
  useEffect(() => {
    if (ref.current && ref.current.editor) {
      const monacoEditor = ref.current.editor;
      const hasFocus = monacoEditor.hasTextFocus();
      const currentValue = monacoEditor.getValue();
      if (!hasFocus && currentValue !== value) {
        ref.current.isProgrammaticChange = true;
        monacoEditor.setValue(value ?? '');
        ref.current.isProgrammaticChange = false;
        changeFilter.current.set(value ?? '');
      }
    }
  }, [value]);

  return (
    <MonacoEditorAutoResize
      {...restProps}
      editorWillMount={editorWillMount}
      editorDidMount={editorDidMount}
      editorWillUnmount={editorWillUnmount}
      defaultValue={value}
    />
  );
});

export { MonacoTextArea };
