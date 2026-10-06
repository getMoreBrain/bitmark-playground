// The React adapter (PLAN-022 D3): a session in context, panes as components.
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
import { createEchoGuard } from '../session/echoGuard';
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

/** One document (PLAN-022 D9). Created once; `monaco` and `engine` are read at creation. */
export const BitmarkSession = (props: BitmarkSessionProps): ReactElement => {
  const { children, value, theme, onChange, onError, onReady } = props;
  const [session, setSession] = useState<Session>();
  /** The session's recent reports: a `value` among them is the host's own echo. */
  const echo = useRef(createEchoGuard());
  const latest = useRef({ onChange, onError, onReady });
  latest.current = { onChange, onError, onReady };

  useEffect(() => {
    const { monaco, children: _c, onChange: _o, onError: _e, onReady: _r, ...options } = props;
    const s = createBitmarkSession({ ...options, monaco: monaco as Monaco, value, theme });
    const offs = [
      s.on('change', (e) => {
        echo.current.remember(e.bitmark);
        latest.current.onChange?.(e);
      }),
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
    // A controlled `value` that is (or lags behind as) our own emission is
    // not a new document: setting it back would undo the user's typing.
    if (
      session &&
      value !== undefined &&
      !echo.current.isEcho(value) &&
      value !== session.getBitmark()
    ) {
      session.setBitmark(value);
    }
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
  /** After each regeneration that is shown: how long it took. */
  onRender?: (info: { durationMs: number }) => void;
}

/** One pane of the nearest `<BitmarkSession>`, in a `<div>` the host sizes. */
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
    onRender,
  } = props;
  const session = useBitmarkSession();
  const ref = useRef<HTMLDivElement>(null);
  const paneRef = useRef<Pane>();
  const onRenderRef = useRef(onRender);
  onRenderRef.current = onRender;

  useEffect(() => {
    const el = ref.current;
    if (!session || !el) return;
    const options = {
      readOnly,
      scrollSync,
      label,
      editorOptions,
      onRender: (info: { durationMs: number }) => onRenderRef.current?.(info),
    };
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
