/** @jsxImportSource theme-ui */
import { BitmarkEngine, createLatestRunner, SUPERSEDED } from '@gmb/bitmark-editor';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Flex } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { createFrameScrollEditor, FrameScrollEditor } from '../../scrollSync/frameScrollEditor';
import { joinScrollSync } from '../../scrollSync/scrollSync';
import { useBitmarkParser } from '../../services/BitmarkParser';
import { bitmarkState } from '../../state/bitmarkState';
import PREVIEW_CSS from './htmlPreview.css?raw';

const HTML_OPTIONS = { inputFormat: 'bitmark', outputFormat: 'html' } as const;

/** The frame's document: loaded once; each update replaces its body (PLAN-028 D3). */
const FRAME_DOC = `<!doctype html><html><head><meta charset="utf-8"><style>${PREVIEW_CSS}</style></head><body></body></html>`;

/**
 * No `allow-scripts`: nothing in the document can run (PLAN-028 D3).
 * `allow-same-origin` lets the playground write the frame's body.
 */
export const PREVIEW_SANDBOX = 'allow-same-origin allow-popups allow-popups-to-escape-sandbox';

type Content = { html: string } | { message: string; error?: boolean };

/** A gap's solutions, for its label: `a / b` (PLAN-028 D6). */
const gapLabel = (solutions: string | null): string => {
  try {
    const parsed: unknown = JSON.parse(solutions ?? '[]');
    return Array.isArray(parsed) ? parsed.join(' / ') : String(parsed);
  } catch {
    return solutions ?? '';
  }
};

/**
 * What the stylesheet cannot do itself (PLAN-028 D6): label each gap with its
 * solutions, and show each `&image` resource as an image.
 */
export const enrichPreview = (root: ParentNode): void => {
  root.querySelectorAll('bitmark-node[data-type="gap"]').forEach((gap) => {
    gap.setAttribute('data-label', gapLabel(gap.getAttribute('data-solutions')));
  });
  root.querySelectorAll('bitmark-tag[data-name="&image"]').forEach((tag) => {
    const url = tag.textContent?.trim();
    if (!url || tag.querySelector('img')) return;
    const img = tag.ownerDocument.createElement('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    tag.append(img);
  });
};

export interface HtmlPreviewProps {
  /** The playground's pane class (its border), as the other top tabs have. */
  className?: string;
}

/** The document's HTML, rendered (PLAN-028). */
const HtmlPreview = ({ className }: HtmlPreviewProps) => {
  const { wasm } = useSnapshot(bitmarkState);
  const { engine, markupReady, loadError } = useBitmarkParser();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<FrameScrollEditor>();

  // Linked scrolling, by bit (PLAN-028 D8): one card per bit, in order.
  useEffect(() => {
    const win = frameRef.current?.contentWindow;
    if (!loaded || !win) return;
    const scroll = createFrameScrollEditor(win, 'body > bitmark-bit');
    const member = joinScrollSync(scroll.editor, scroll.bitStarts);
    scrollRef.current = scroll;
    return () => {
      member.dispose();
      scroll.dispose();
      scrollRef.current = undefined;
    };
  }, [loaded]);

  // `html` is a markup format: only the full engine has it (PLAN-028 D2).
  // It is made in the parser's worker (PLAN-030 D4): latest wins, and a
  // result for an older bitmark is dropped (D6).
  const [content, setContent] = useState<Content>({ message: 'Loading the full parser…' });
  const runHtml = useMemo(
    () =>
      createLatestRunner((parser: BitmarkEngine, markup: string) =>
        parser.convert(markup, HTML_OPTIONS),
      ),
    [],
  );
  useEffect(() => {
    if (loadError) {
      setContent({ message: 'The bitmark parser failed to load.', error: true });
      return;
    }
    if (!engine || !markupReady) {
      setContent({ message: 'Loading the full parser…' });
      return;
    }
    // Still the bitmark the state holds when the result arrives (the state
    // can change before this component re-renders).
    const markup = wasm.markup;
    let current = true;
    const isCurrent = () => current && bitmarkState.wasm.markup === markup;
    runHtml(engine, markup).then(
      (html) => {
        if (isCurrent() && html !== SUPERSEDED) setContent({ html });
      },
      (e: unknown) => {
        if (isCurrent()) setContent({ message: String(e), error: true });
      },
    );
    return () => {
      current = false;
    };
  }, [wasm.markup, engine, markupReady, loadError, runHtml]);

  useEffect(() => {
    const body = frameRef.current?.contentDocument?.body;
    if (!loaded || !body) return;
    if ('html' in content) {
      body.innerHTML = content.html;
      enrichPreview(body);
      scrollRef.current?.contentChanged();
      return;
    }
    const message = body.ownerDocument.createElement('p');
    message.className = content.error ? 'preview-message error' : 'preview-message';
    message.textContent = content.message;
    body.replaceChildren(message);
    scrollRef.current?.contentChanged();
  }, [content, loaded]);

  return (
    <Flex className={className} sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
      <iframe
        ref={frameRef}
        title="Preview"
        sandbox={PREVIEW_SANDBOX}
        srcDoc={FRAME_DOC}
        onLoad={() => setLoaded(true)}
        sx={{ flexGrow: 1, width: '100%', border: 0, backgroundColor: '#1e1e1e' }}
      />
    </Flex>
  );
};

export { HtmlPreview };
