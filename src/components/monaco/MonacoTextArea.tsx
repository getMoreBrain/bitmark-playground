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
