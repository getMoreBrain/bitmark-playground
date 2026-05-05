// Mock react-monaco-editor for test environment
import React from 'react';

const MonacoEditor = React.forwardRef(function MonacoEditor(
  props: Record<string, unknown>,
  ref: React.Ref<unknown>,
) {
  void ref;
  // React drops `defaultValue` and `value` from a <div>'s rendered attributes,
  // so mirror them onto data-* attributes for test inspection.
  const { defaultValue, value, ...rest } = props as { defaultValue?: unknown; value?: unknown };
  const dataAttrs: Record<string, unknown> = {};
  if (defaultValue !== undefined) dataAttrs['data-default-value'] = defaultValue;
  if (value !== undefined) dataAttrs['data-value'] = value;
  return React.createElement('div', { 'data-testid': 'monaco-editor', ...rest, ...dataAttrs });
});

export const MonacoDiffEditor = React.forwardRef(function MonacoDiffEditor(
  props: Record<string, unknown>,
  ref: React.Ref<unknown>,
) {
  void ref;
  return React.createElement('div', { 'data-testid': 'monaco-diff-editor', ...props });
});

export default MonacoEditor;
