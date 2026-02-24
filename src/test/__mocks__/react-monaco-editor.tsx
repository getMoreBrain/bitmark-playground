// Mock react-monaco-editor for test environment
import React from 'react';

const MonacoEditor = React.forwardRef(function MonacoEditor(props: Record<string, unknown>, ref: React.Ref<unknown>) {
  void ref;
  return React.createElement('div', { 'data-testid': 'monaco-editor', ...props });
});

export const MonacoDiffEditor = React.forwardRef(function MonacoDiffEditor(
  props: Record<string, unknown>,
  ref: React.Ref<unknown>,
) {
  void ref;
  return React.createElement('div', { 'data-testid': 'monaco-diff-editor', ...props });
});

export default MonacoEditor;
