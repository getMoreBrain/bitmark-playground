// @awa-component: PLAN-018-BitMarkers
import type { CodeEditor, IDisposable, Monaco } from '../monaco/types';

/** An output pane's bit starts, pinned in its editor so they follow every edit. */
export interface BitMarkers extends IDisposable {
  /**
   * Pin `bitStarts` if the editor shows exactly `text` (PLAN-018 D4).
   * - `bitStarts` undefined (the user typed that text): nothing changes, and
   *   the markers keep following the user's edits.
   * - The editor shows other text while it has focus (`MonacoTextArea` skipped
   *   the update): nothing changes either.
   * - The editor shows other text without focus (an error message): the
   *   markers are cleared, as they describe text that is gone.
   */
  pin(text: string, bitStarts: readonly number[] | undefined): void;
  /** The markers' current offsets, in order. */
  bitStarts(): number[];
}

/**
 * Attach bit markers to an output pane. `onChange` is called whenever the
 * markers are pinned or cleared. Monaco moves them through edits by itself
 * (PLAN-018 D3), which the pane reports as a content change.
 */
// @awa-impl: PLAN-018-Step4 (pin bit starts as decorations; read them back)
export const attachBitMarkers = (
  monaco: Monaco,
  editor: CodeEditor,
  onChange: () => void,
): BitMarkers => {
  const collection = editor.createDecorationsCollection();

  const pin = (text: string, bitStarts: readonly number[] | undefined): void => {
    if (bitStarts === undefined) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() !== text) {
      if (!editor.hasTextFocus()) {
        collection.clear();
        onChange();
      }
      return;
    }
    collection.set(
      bitStarts.map((offset) => {
        const { lineNumber, column } = model.getPositionAt(offset);
        return {
          range: {
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
          },
          options: {
            description: 'bit-start',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        };
      }),
    );
    onChange();
  };

  const bitStarts = (): number[] => {
    const model = editor.getModel();
    if (!model) return [];
    return collection
      .getRanges()
      .map((range) =>
        model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn }),
      )
      .sort((a, b) => a - b);
  };

  return { pin, bitStarts, dispose: () => collection.clear() };
};
