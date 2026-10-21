import type { ScrollSyncEditor } from '@gmb/bitmark-editor';

/** What the adapter needs of the frame's window. */
export type FrameWindow = Pick<
  Window,
  'scrollY' | 'scrollTo' | 'innerHeight' | 'addEventListener' | 'removeEventListener'
> & { readonly document: Document };

/** A frame's own scrolls arrive asynchronously; this long after setting one, they are echoes. */
export const ECHO_MS = 150;

type Listener = (e?: { scrollTopChanged: boolean; scrollHeightChanged: boolean }) => void;

export interface FrameScrollEditor {
  /** For `joinScrollSync`. */
  readonly editor: ScrollSyncEditor;
  /** One "offset" per bit: bit `i` is offset `i` (see `getPositionAt`). */
  bitStarts(): readonly number[];
  /** The frame's content was replaced (the bits moved). */
  contentChanged(): void;
  dispose(): void;
}

/**
 * A rendered page as a scroll-sync member (PLAN-028): the group's view of a
 * Monaco editor, over a frame whose bits are the elements `bitSelector`
 * matches, in order. Each bit is a "line": offset `i` is line `i + 1`, whose
 * top is the `i`-th bit's top in the page.
 *
 * The group ignores its own scrolls of a follower by seeing them reported
 * synchronously, as Monaco does; a frame reports them later, so the adapter
 * drops the scroll events that follow its own `setScrollTop` (ECHO_MS).
 */
export const createFrameScrollEditor = (
  win: FrameWindow,
  bitSelector: string,
  now: () => number = () => performance.now(),
): FrameScrollEditor => {
  const doc = win.document;
  const scrollListeners = new Set<Listener>();
  const contentListeners = new Set<Listener>();
  const layoutListeners = new Set<Listener>();
  let echoUntil = 0;
  let lastHeight = doc.documentElement.scrollHeight;
  // The group asks for every bit's top in a row: look the bits up once per
  // content or layout change, not once per bit (a book has thousands).
  let bitsCache: Element[] | undefined;
  const bits = (): Element[] => (bitsCache ??= Array.from(doc.querySelectorAll(bitSelector)));
  const subscribe = (set: Set<Listener>) => (l: Listener) => {
    set.add(l);
    return { dispose: () => set.delete(l) };
  };
  const emit = (set: Set<Listener>) => set.forEach((l) => l());

  const onScroll = () => {
    if (now() < echoUntil) return;
    const height = doc.documentElement.scrollHeight;
    const scrollHeightChanged = height !== lastHeight;
    lastHeight = height;
    scrollListeners.forEach((l) => l({ scrollTopChanged: true, scrollHeightChanged }));
  };
  const onResize = () => {
    bitsCache = undefined;
    emit(layoutListeners);
  };
  win.addEventListener('scroll', onScroll);
  win.addEventListener('resize', onResize);
  // Images load and cards reflow without a content change. A height already
  // seen (`contentChanged` just reported it) is not reported again.
  const resize = new ResizeObserver(() => {
    const height = doc.documentElement.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    emit(contentListeners);
  });
  resize.observe(doc.documentElement);

  const editor = {
    getModel: () => ({
      getPositionAt: (offset: number) => ({ lineNumber: offset + 1, column: 1 }),
    }),
    getTopForPosition: (lineNumber: number) => {
      const bit = bits()[lineNumber - 1];
      return bit ? bit.getBoundingClientRect().top + win.scrollY : 0;
    },
    getScrollTop: () => win.scrollY,
    setScrollTop: (top: number) => {
      echoUntil = now() + ECHO_MS;
      win.scrollTo(0, top);
    },
    getScrollHeight: () => doc.documentElement.scrollHeight,
    getLayoutInfo: () => ({ height: win.innerHeight }),
    // Never the leader on a content change: the editors are typed into.
    hasTextFocus: () => false,
    onDidScrollChange: subscribe(scrollListeners),
    onDidChangeModelContent: subscribe(contentListeners),
    onDidContentSizeChange: subscribe(contentListeners),
    onDidLayoutChange: subscribe(layoutListeners),
  };

  return {
    editor: editor as unknown as ScrollSyncEditor,
    bitStarts: () => bits().map((_, i) => i),
    contentChanged: () => {
      bitsCache = undefined;
      lastHeight = doc.documentElement.scrollHeight;
      emit(contentListeners);
    },
    dispose: () => {
      win.removeEventListener('scroll', onScroll);
      win.removeEventListener('resize', onResize);
      resize.disconnect();
      scrollListeners.clear();
      contentListeners.clear();
      layoutListeners.clear();
    },
  };
};
