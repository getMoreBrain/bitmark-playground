// @awa-component: PLAN-021-AngularWrapper
import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { BitmarkSessionOptions, BitmarkTheme, EngineSource, Monaco } from '@gmb/bitmark-editor';

/** App-wide defaults for every `bm-session` (PLAN-020 D10). */
export interface BitmarkEditorConfig {
  /** The host's Monaco (D8): the instance, or an async factory (e.g. waiting for `window.monaco`). */
  monaco?: Monaco | (() => Monaco | Promise<Monaco>);
  /** The parser (D2, D7): injected, or how to load it. A factory is called once per session. */
  engine?: EngineSource | (() => EngineSource);
  theme?: BitmarkTheme;
  messages?: BitmarkSessionOptions['messages'];
  /** The JSON schema for every session: an object, a URL, or `false`. */
  schema?: unknown;
  /** Default true: Monaco widgets in one fixed overflow node, not clipped by scroll containers or dialogs. */
  fixedOverflowWidgets?: boolean;
}

export const BITMARK_EDITOR_CONFIG = new InjectionToken<BitmarkEditorConfig>('BITMARK_EDITOR_CONFIG');

/** Provide defaults for every `bm-session` in the app. */
// @awa-impl: PLAN-021-Step13a (provideBitmarkEditor)
export const provideBitmarkEditor = (config: BitmarkEditorConfig): EnvironmentProviders =>
  makeEnvironmentProviders([{ provide: BITMARK_EDITOR_CONFIG, useValue: config }]);
