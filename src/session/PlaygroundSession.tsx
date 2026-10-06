// @awa-component: PLAN-021-PlaygroundSession
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
 * The playground on the package (PLAN-021 Step 14): one session whose
 * document is the bitmark the left editor shows. The WASM JSON tabs, HTML,
 * Text, the XML tabs, Info and Mappings are its panes. The left editor, the
 * Original (bpg) JSON tab, WASM Check, Diff and Lexer stay the playground's,
 * and the two sides meet here:
 * - a playground edit pushes the new bitmark into the session, with its
 *   origin (for the mapping report);
 * - an edit in a session pane goes back through the playground's own
 *   pipeline, so every parser tab, the lexer and the LED stay current.
 */

/** How an edit in a session pane goes back into the playground's pipeline. */
type PaneRoute = (pane: Pane, change: SessionChange, converter: BitmarkConverter) => void;
const routes = new WeakMap<Pane, PaneRoute>();

const MESSAGES = {
  // The playground always loads the full parser; until it lands, say so.
  needsFullParser: 'Loading the full parser…',
};

/** The playground's document: the bitmark the left editor shows. */
const shownBitmark = (): string => bitmarkState[bitmarkState.activeMarkupTab].markup;

/** The session for the whole playground. Mount once, inside `BitmarkParserProvider`. */
// @awa-impl: PLAN-021-Step14 (the playground's session)
export const PlaygroundSession = ({ children }: { children: ReactNode }): ReactElement => {
  const { engine } = useBitmarkParser();
  // Created once; the engine arrives after the first load stage.
  const deferred = useMemo(() => {
    let resolve!: (e: BitmarkEngine) => void;
    const promise = new Promise<BitmarkEngine>((r) => (resolve = r));
    return { promise, resolve };
  }, []);
  useEffect(() => {
    if (engine) deferred.resolve(engine);
  }, [engine, deferred]);
  const [initial] = useState(shownBitmark);
  const converter = useBitmarkConverter();
  const latest = useRef(converter);
  latest.current = converter;

  const onChange = useCallback((e: SessionChange) => {
    if (e.source) routes.get(e.source)?.(e.source, e, latest.current);
  }, []);

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
      onChange={onChange}
    >
      <SessionSync />
      {children}
    </BitmarkSession>
  );
};

/** Push the playground's edits (and left-tab switches) into the session. */
// @awa-impl: PLAN-021-Step14 (playground → session)
const SessionSync = (): null => {
  const session = useBitmarkSession();
  useEffect(() => {
    if (!session) return;
    let tab = bitmarkState.activeMarkupTab;
    const sync = () => {
      const doc = shownBitmark();
      if (bitmarkState.activeMarkupTab !== tab) {
        // Another left tab: the session shows its bitmark; not an edit.
        tab = bitmarkState.activeMarkupTab;
        if (doc !== session.getBitmark()) session.setBitmark(doc, false);
        return;
      }
      const { origin, inputFormat, content, label } = bitmarkState.lastEdit;
      // An edit made in a session pane is in the session already.
      if (origin === 'session' || doc === session.getBitmark()) return;
      // Before the first edit (the initial document) there is no origin.
      session.setBitmark(doc, inputFormat ? { inputFormat, content, label } : false);
    };
    sync();
    return subscribe(bitmarkState, sync);
  }, [session]);
  return null;
};

/** The right-hand tabs (and bottom panels) that are session panes. */
export type SessionTab = 'wasm' | 'wasmFull' | TimedPane | 'info' | 'mappings';

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
  (pane, _change, converter) => {
    const json = pane.textEditor.getValue();
    bitmarkState.setLastEdit('json', json, label, 'session');
    void converter.jsonToMarkup(tab, json);
  };

/** A markup-format edit (HTML, XML): its bitmark goes in as an edit of the left tab. */
const markupRoute =
  (inputFormat: string, label: string): PaneRoute =>
  (pane, change, converter) => {
    bitmarkState.setLastEdit(inputFormat, pane.textEditor.getValue(), label, 'session');
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
// @awa-impl: PLAN-021-Step14 (session panes as playground tabs; session → playground)
export const SessionPaneTab = ({
  tab,
  className,
}: {
  tab: SessionTab;
  /** The playground's editor class (its border, and `.json-editor` for the checks). */
  className?: string;
}): ReactElement => {
  const ui = useSnapshot(uiState);
  const spec = TABS[tab];
  const onPane = useCallback(
    (pane: Pane | undefined) => {
      if (pane && spec.route) routes.set(pane, spec.route);
    },
    [spec],
  );
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
      scrollSync={spec.scroll === false ? false : ui.linkScroll}
      onPane={onPane}
      onRender={onRender}
      className={className}
      style={{ height: '100%', width: '100%' }}
    />
  );
};
