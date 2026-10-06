// A fake Monaco editor for the linked-scrolling tests (PLAN-018): the Monaco
// mock has no scroll, layout or decoration API. Every line is LINE_HEIGHT
// pixels tall and nothing wraps.
import type * as monaco from 'monaco-editor';

// A copy of src/test/fakeEditor.ts: src/lib may not import outside itself (PLAN-022 D6).

export const LINE_HEIGHT = 10;

type Listener<T> = (e: T) => void;

const emitter = <T>() => {
  const listeners = new Set<Listener<T>>();
  return {
    on: (listener: Listener<T>) => {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    fire: (e: T) => {
      for (const listener of [...listeners]) listener(e);
    },
    get size() {
      return listeners.size;
    },
  };
};

export const createFakeEditor = (text: string, viewportHeight = 50) => {
  let value = text;
  let versionId = 1;
  let scrollTop = 0;
  let focused = false;
  let decorations: number[] = [];

  const lineStarts = () => {
    const starts = [0];
    for (let i = 0; i < value.length; i++) if (value[i] === '\n') starts.push(i + 1);
    return starts;
  };

  const model = {
    getValue: () => value,
    getVersionId: () => versionId,
    getPositionAt: (offset: number) => {
      const starts = lineStarts();
      let line = 0;
      while (line + 1 < starts.length && starts[line + 1]! <= offset) line++;
      return { lineNumber: line + 1, column: offset - starts[line]! + 1 };
    },
    getOffsetAt: ({ lineNumber, column }: { lineNumber: number; column: number }) =>
      lineStarts()[lineNumber - 1]! + column - 1,
  };

  const scroll = emitter<Partial<monaco.IScrollEvent>>();
  const content = emitter<unknown>();
  const contentSize = emitter<unknown>();
  const layout = emitter<unknown>();
  const modelChange = emitter<unknown>();

  const scrollHeight = () => lineStarts().length * LINE_HEIGHT;
  const maxScrollTop = () => Math.max(0, scrollHeight() - viewportHeight);

  const editor = {
    getModel: () => model,
    getValue: () => value,
    getScrollTop: () => scrollTop,
    setScrollTop: (top: number) => {
      const next = Math.round(Math.min(maxScrollTop(), Math.max(0, top)));
      if (next === scrollTop) return;
      scrollTop = next;
      scroll.fire({ scrollTop, scrollTopChanged: true, scrollHeightChanged: false });
    },
    getScrollHeight: scrollHeight,
    getLayoutInfo: () => ({ height: viewportHeight }),
    getTopForPosition: (lineNumber: number) => (lineNumber - 1) * LINE_HEIGHT,
    hasTextFocus: () => focused,
    onDidScrollChange: scroll.on,
    onDidChangeModelContent: content.on,
    onDidContentSizeChange: contentSize.on,
    onDidLayoutChange: layout.on,
    onDidChangeModel: modelChange.on,
    createDecorationsCollection: () => ({
      set: (items: { range: monaco.IRange }[]) => {
        decorations = items.map((d) =>
          model.getOffsetAt({
            lineNumber: d.range.startLineNumber,
            column: d.range.startColumn,
          }),
        );
      },
      clear: () => {
        decorations = [];
      },
      getRanges: () =>
        decorations.map((offset) => {
          const { lineNumber, column } = model.getPositionAt(offset);
          return { startLineNumber: lineNumber, startColumn: column };
        }),
    }),
  };

  return {
    editor: editor as unknown as monaco.editor.ICodeEditor,
    /** The user scrolls. */
    userScroll: (top: number) => editor.setScrollTop(top),
    /** Replace the text, as a conversion or the user does. */
    setValue: (next: string) => {
      value = next;
      versionId++;
      content.fire({});
    },
    setFocus: (next: boolean) => {
      focused = next;
    },
    /** Offsets of the pinned decorations, as the fake stores them. */
    decorations: () => decorations,
    /** How many listeners are attached, across all events. */
    listenerCount: () =>
      scroll.size + content.size + contentSize.size + layout.size + modelChange.size,
    fireLayout: () => layout.fire({}),
  };
};
