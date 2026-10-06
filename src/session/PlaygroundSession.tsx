// @awa-component: PLAN-023-PlaygroundSession
import type {
  BitmarkEngine,
  BitmarkPane as Pane,
  Monaco,
  SessionChange,
} from '@gmb/bitmark-editor';
import { BitmarkPane, BitmarkSession, useBitmarkSession } from '@gmb/bitmark-editor/react';
import * as monaco from 'monaco-editor';
import { ReactElement, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribe, useSnapshot } from 'valtio';

import { playgroundScrollGroup } from '../scrollSync/scrollSync';
import { BitmarkConverter, useBitmarkConverter } from '../services/BitmarkConverter';
import { useBitmarkParser } from '../services/BitmarkParser';
import { bitmarkState, TimedPane, XmlVariant } from '../state/bitmarkState';
import { uiState } from '../state/uiState';

/**
 * The playground on the package (PLAN-023 Step 14): one session whose
 * document is the bitmark the left editor shows. The WASM JSON tabs, HTML,
 * Text, the XML tabs, Info and Mappings are its panes. The left editor, the
 * Original (bpg) JSON tab, WASM Check, Diff and Lexer stay the playground's,
 * and the two sides meet here:
 * - a playground edit pushes the new bitmark into the session, with its
 *   origin (for the mapping report);
 * - an edit in a session pane goes back through the playground's own
 *   pipeline, so every parser tab, the lexer and the LED stay current.
 */

/**
 * How an edit in a session pane goes back into the playground's pipeline.
 * `text` is the pane text the session converted (not the pane's current
 * text, which may be newer).
 */
type PaneRoute = (text: string, change: SessionChange, converter: BitmarkConverter) => void;
const routes = new WeakMap<Pane, PaneRoute>();

const MESSAGES = {
  // The playground always loads the full parser; until it lands, say so.
  needsFullParser: 'Loading the full parser…',
};

/** The playground's document: the bitmark the left editor shows. */
const shownBitmark = (): string => bitmarkState[bitmarkState.activeMarkupTab].markup;

/** The session for the whole playground. Mount once, inside `BitmarkParserProvider`. */
// @awa-impl: PLAN-023-Step14 (the playground's session)
export const PlaygroundSession = ({ children }: { children: ReactNode }): ReactElement => {
  const { engine, loadError } = useBitmarkParser();
  // Created once; the engine arrives after the first load stage.
  const deferred = useMemo(() => {
    let resolve!: (e: BitmarkEngine) => void;
    let reject!: (e: Error) => void;
    const promise = new Promise<BitmarkEngine>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }, []);
  useEffect(() => {
    if (engine) deferred.resolve(engine);
    // The panes then show the load error, not an endless "loading".
    else if (loadError) deferred.reject(new Error('The bitmark parser failed to load.'));
  }, [engine, loadError, deferred]);
  const [initial] = useState(shownBitmark);

  return (
    <BitmarkSession
      monaco={monaco as unknown as Monaco}
      engine={deferred.promise}
      value={initial}
      // The playground binds the schema itself, for all its JSON editors.
      schema={false}
      theme="dark"
      scrollGroup={playgroundScrollGroup()}
      messages={MESSAGES}
    >
      <SessionSync />
      {children}
    </BitmarkSession>
  );
};

/** Keep the session and the playground's state in step, both ways. */
// @awa-impl: PLAN-023-Step14 (playground → session; session → playground)
const SessionSync = (): null => {
  const session = useBitmarkSession();
  const converter = useBitmarkConverter();
  const latest = useRef(converter);
  latest.current = converter;

  useEffect(() => {
    if (!session) return;
    // Session → playground: a pane edit runs the playground's own pipeline.
    const off = session.on('change', (e) => {
      const route = e.source && routes.get(e.source);
      if (route) route(session.lastEdit?.content ?? '', e, latest.current);
    });

    // Playground → session.
    let tab = bitmarkState.activeMarkupTab;
    let seenEdits = bitmarkState.lastEdit.updates;
    // After a left-tab switch the session follows the shown bitmark again,
    // even while the last edit was a session pane's (its pipeline may still
    // be filling the newly shown tab).
    let switched = false;
    const sync = () => {
      const doc = shownBitmark();
      const { origin, inputFormat, content, label, updates } = bitmarkState.lastEdit;
      if (updates !== seenEdits) {
        seenEdits = updates;
        switched = false;
      }
      if (bitmarkState.activeMarkupTab !== tab) {
        tab = bitmarkState.activeMarkupTab;
        switched = true;
      }
      if (doc === session.getBitmark()) return;
      if (origin === 'session') {
        // That edit is in the session already; only a tab switch shows
        // another bitmark (not an edit).
        // Never while a session pane has focus: that would replace what is
        // being typed there (its own commit then brings the two in step).
        if (switched && !document.activeElement?.closest('.bm-pane')) {
          session.setBitmark(doc, false);
        }
        return;
      }
      // Before the first edit (the initial document) there is no origin.
      session.setBitmark(doc, inputFormat && !switched ? { inputFormat, content, label } : false);
    };
    sync();
    const unsubscribe = subscribe(bitmarkState, sync);
    return () => {
      off();
      unsubscribe();
    };
  }, [session]);
  return null;
};

/** The right-hand tabs (and bottom panels) that are session panes. */
export type SessionTab = 'wasm' | 'wasmFull' | TimedPane | 'info' | 'mappings';

/**
 * The right-hand (JSON side) tabs that are session panes, in tab order.
 * `timed` ones stay mounted (hidden) when inactive, so their tab duration
 * stays current; the others mount only while shown.
 */
export const RIGHT_SESSION_TABS = [
  'wasm',
  'wasmFull',
  'tableHtml',
  'text',
  'xmlNiso',
  'xmlNisoEs',
] as const satisfies readonly SessionTab[];

/** Whether a tab's pane stays mounted while hidden (it has a tab duration). */
export const keepsMounted = (tab: SessionTab): boolean => TABS[tab].timed !== undefined;

interface TabSpec {
  type: 'json' | 'html' | 'xml' | 'text' | 'info' | 'mappings';
  label: string;
  mode?: 'optimized' | 'full';
  mapping?: string;
  route?: PaneRoute;
  timed?: TimedPane;
  scroll?: boolean;
}

/** A JSON edit goes through the playground's JSON pipeline for its tab. */
const jsonRoute =
  (tab: 'wasm' | 'wasmFull', label: string): PaneRoute =>
  (json, _change, converter) => {
    bitmarkState.setLastEdit('json', json, label, 'session');
    void converter.jsonToMarkup(tab, json);
  };

/** A markup-format edit (HTML, XML): its bitmark goes in as an edit of the left tab. */
const markupRoute =
  (inputFormat: string, label: string): PaneRoute =>
  (text, change, converter) => {
    bitmarkState.setLastEdit(inputFormat, text, label, 'session');
    void converter.markupToJson(bitmarkState.activeMarkupTab, change.bitmark);
  };

const XML_MAPPING: Record<XmlVariant, string> = {
  xmlNiso: 'xml-niso-iec',
  xmlNisoEs: 'xml-niso-iec-es',
};
const XML_LABEL: Record<XmlVariant, string> = {
  xmlNiso: 'XML (NISO-IEC)',
  xmlNisoEs: 'XML (NISO-IEC-ES)',
};

const TABS: Record<SessionTab, TabSpec> = {
  wasm: { type: 'json', label: 'WASM JSON', route: jsonRoute('wasm', 'WASM JSON') },
  wasmFull: {
    type: 'json',
    mode: 'full',
    label: 'WASM (full) JSON',
    route: jsonRoute('wasmFull', 'WASM (full) JSON'),
  },
  tableHtml: {
    type: 'html',
    label: 'HTML',
    route: markupRoute('html', 'HTML'),
    timed: 'tableHtml',
  },
  text: { type: 'text', label: 'Text', timed: 'text' },
  xmlNiso: {
    type: 'xml',
    mapping: XML_MAPPING.xmlNiso,
    label: XML_LABEL.xmlNiso,
    route: markupRoute(XML_MAPPING.xmlNiso, XML_LABEL.xmlNiso),
    timed: 'xmlNiso',
  },
  xmlNisoEs: {
    type: 'xml',
    mapping: XML_MAPPING.xmlNisoEs,
    label: XML_LABEL.xmlNisoEs,
    route: markupRoute(XML_MAPPING.xmlNisoEs, XML_LABEL.xmlNisoEs),
    timed: 'xmlNisoEs',
  },
  info: { type: 'info', label: 'Info', scroll: false },
  mappings: { type: 'mappings', label: 'Mappings', scroll: false },
};

/** One session pane for a playground tab or panel. */
// @awa-impl: PLAN-023-Step14 (session panes as playground tabs; session → playground)
export const SessionPaneTab = ({
  tab,
  className,
  hidden = false,
}: {
  tab: SessionTab;
  /** The playground's editor class (its border, and `.json-editor` for the checks). */
  className?: string;
  /**
   * Mounted but not shown: it still converts on every edit, so its tab keeps
   * a current duration (as the playground's runners did); it doesn't scroll.
   */
  hidden?: boolean;
}): ReactElement => {
  const ui = useSnapshot(uiState);
  const spec = TABS[tab];
  const paneRef = useRef<Pane>();
  const onPane = useCallback(
    (pane: Pane | undefined) => {
      paneRef.current = pane;
      if (pane && spec.route) routes.set(pane, spec.route);
    },
    [spec],
  );
  // Shown again: lay out first (it was 0×0 while hidden), then rejoin the
  // scroll linking, so it follows to the right bit.
  const [laidOut, setLaidOut] = useState(!hidden);
  useEffect(() => {
    if (hidden) {
      setLaidOut(false);
      return;
    }
    paneRef.current?.layout();
    const frame = requestAnimationFrame(() => setLaidOut(true));
    return () => cancelAnimationFrame(frame);
  }, [hidden]);
  const onRender = useCallback(
    ({ durationMs }: { durationMs: number }) => {
      if (spec.timed) bitmarkState.setPaneDuration(spec.timed, durationMs / 1000);
    },
    [spec],
  );
  return (
    <BitmarkPane
      key={tab}
      type={spec.type}
      mode={spec.mode}
      mapping={spec.mapping}
      label={spec.label}
      scrollSync={spec.scroll === false || hidden || !laidOut ? false : ui.linkScroll}
      onPane={onPane}
      onRender={onRender}
      className={className}
      style={{ height: '100%', width: '100%', display: hidden ? 'none' : undefined }}
    />
  );
};
