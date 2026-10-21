import { useSyncExternalStore } from 'react';
import type { ThemeUIStyleObject } from 'theme-ui';

/** Below this width (px) the panels stack vertically (PLAN-027 D1). */
export const NARROW_MAX_WIDTH = 899.98;

export const NARROW_QUERY = `(max-width: ${NARROW_MAX_WIDTH}px)`;

/** For `sx`: styles that apply only while the panels are stacked. */
export const NARROW_MEDIA = `@media ${NARROW_QUERY}`;

/**
 * A stacked panel: full width, a fixed share of the screen height, the page
 * scrolls between panels (PLAN-027 D3).
 */
export const STACKED_PANEL_SX: ThemeUIStyleObject = {
  [NARROW_MEDIA]: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    height: '70vh',
    minHeight: 320,
    // The dynamic viewport height does not jump with a phone's browser bars.
    '@supports (height: 1dvh)': { height: '70dvh' },
  },
};

const subscribe = (onChange: () => void): (() => void) => {
  const query = window.matchMedia?.(NARROW_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
};

const isNarrow = (): boolean => window.matchMedia?.(NARROW_QUERY).matches ?? false;

/** Whether the panels are stacked: the window is narrower than the breakpoint (PLAN-027 D1). */
export const useNarrowLayout = (): boolean => useSyncExternalStore(subscribe, isNarrow);
