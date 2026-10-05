// @awa-component: PLAN-021-ReactAdapter
// The React adapter (PLAN-020 D3): a session in context, panes as components.
import type * as MonacoApi from 'monaco-editor';
import {
  createContext,
  CSSProperties,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { BitmarkEngine } from '../engine/types';
import type { Monaco } from '../monaco/types';
import {
  createBitmarkPane,
  createHtmlPane,
  createInfoPane,
  createJsonPane,
  createMappingsPane,
  createTextPane,
  createXmlPane,
} from '../panes/panes';
import { createBitmarkSession } from '../session/session';
import type {
  BitmarkPane as Pane,
  BitmarkSession as Session,
  BitmarkSessionOptions,
  PaneType,
  SessionChange,
  SessionError,
} from '../session/types';
import type { BitmarkTheme } from '../theme/applyTheme';

const SessionContext = createContext<Session | undefined>(undefined);

/** The nearest `<BitmarkSession>`'s session (`undefined` until it exists). */
export const useBitmarkSession = (): Session | undefined => useContext(SessionContext);

export interface BitmarkSessionProps extends Omit<
  BitmarkSessionOptions,
  'monaco' | 'value' | 'theme'
> {
  monaco: Monaco | typeof MonacoApi;
  /** The document. A change from outside replaces it (`setBitmark`); edits are reported by `onChange`. */
  value?: string;
  theme?: BitmarkTheme;
  onChange?: (change: SessionChange) => void;
  onError?: (error: SessionError) => void;
  onReady?: (engine: BitmarkEngine) => void;
  children?: ReactNode;
}

/** One document (PLAN-020 D9). Created once; `monaco` and `engine` are read at creation. */
// @awa-impl: PLAN-021-Step13 (React: the session)
export const BitmarkSession = (props: BitmarkSessionProps): ReactElement => {
  const { children, value, theme, onChange, onError, onReady } = props;
  const [session, setSession] = useState<Session>();
  const latest = useRef({ onChange, onError, onReady });
  latest.current = { onChange, onError, onReady };

  useEffect(() => {
    const { monaco, children: _c, onChange: _o, onError: _e, onReady: _r, ...options } = props;
    const s = createBitmarkSession({ ...options, monaco: monaco as Monaco, value, theme });
    const offs = [
      s.on('change', (e) => latest.current.onChange?.(e)),
      s.on('error', (e) => latest.current.onError?.(e)),
      s.on('ready', (e) => latest.current.onReady?.(e)),
    ];
    setSession(s);
    return () => {
      for (const off of offs) off();
      s.dispose();
      setSession(undefined);
    };
    // Created once: later prop changes go through the effects below.
  }, []);

  useEffect(() => {
    if (session && value !== undefined && value !== session.getBitmark()) session.setBitmark(value);
  }, [session, value]);

  useEffect(() => {
    if (session && theme !== undefined) session.setTheme(theme);
  }, [session, theme]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
};

export interface BitmarkPaneProps {
  type: PaneType;
  /** JSON panes: `optimized` (default) or `full`. */
  mode?: 'optimized' | 'full';
  /** XML panes: the mapping id (default `xml-niso-iec`). */
  mapping?: string;
  readOnly?: boolean;
  scrollSync?: boolean;
  label?: string;
  editorOptions?: MonacoApi.editor.IStandaloneEditorConstructionOptions;
  className?: string;
  style?: CSSProperties;
  /** The pane, once mounted. */
  onPane?: (pane: Pane | undefined) => void;
}

/** One pane of the nearest `<BitmarkSession>`, in a `<div>` the host sizes. */
// @awa-impl: PLAN-021-Step13 (React: a pane)
export const BitmarkPane = (props: BitmarkPaneProps): ReactElement => {
  const {
    type,
    mode,
    mapping,
    readOnly,
    scrollSync,
    label,
    editorOptions,
    className,
    style,
    onPane,
  } = props;
  const session = useBitmarkSession();
  const ref = useRef<HTMLDivElement>(null);
  const paneRef = useRef<Pane>();

  useEffect(() => {
    const el = ref.current;
    if (!session || !el) return;
    const options = { readOnly, scrollSync, label, editorOptions };
    const pane =
      type === 'bitmark'
        ? createBitmarkPane(el, session, options)
        : type === 'json'
          ? createJsonPane(el, session, { ...options, mode })
          : type === 'html'
            ? createHtmlPane(el, session, options)
            : type === 'xml'
              ? createXmlPane(el, session, { ...options, mapping: mapping ?? 'xml-niso-iec' })
              : type === 'text'
                ? createTextPane(el, session, options)
                : type === 'info'
                  ? createInfoPane(el, session, options)
                  : createMappingsPane(el, session, options);
    paneRef.current = pane;
    onPane?.(pane);
    return () => {
      pane.dispose();
      paneRef.current = undefined;
      onPane?.(undefined);
    };
    // A different pane only for a different type, mode, mapping or label.
  }, [session, type, mode, mapping, label]);

  useEffect(() => {
    if (readOnly !== undefined) paneRef.current?.setReadOnly(readOnly);
  }, [readOnly]);
  useEffect(() => {
    if (scrollSync !== undefined) paneRef.current?.setScrollSync(scrollSync);
  }, [scrollSync]);

  return <div ref={ref} className={className} style={{ height: '100%', ...style }} />;
};
