import { RefObject, useEffect } from 'react';

import type { SearchController } from './searchController';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The Latin letter typed; for a key that types no Latin letter (a Cyrillic or
 * Greek layout, or Option on macOS), the key's place on a US keyboard
 * (PLAN-034 D6). A Latin layout such as Dvorak keeps its own letters.
 */
const isKey = (e: KeyboardEvent, letter: string) => {
  const key = e.key.toLowerCase();
  return /^[a-z]$/.test(key) ? key === letter : e.code === `Key${letter.toUpperCase()}`;
};

/** Ctrl+H, or Cmd+Alt+F (macOS, where Cmd+H hides the app): Monaco's Replace keys. */
const isReplace = (e: KeyboardEvent, mac: boolean) =>
  e.shiftKey
    ? false
    : e.metaKey && e.altKey
      ? isKey(e, 'f')
      : !mac && e.ctrlKey && !e.altKey && !e.metaKey && isKey(e, 'h');

/** Ctrl+F; Cmd+F too, wherever the platform is unknown or misreported. */
const isFind = (e: KeyboardEvent, mac: boolean) =>
  !e.altKey && !e.shiftKey && (e.metaKey || (!mac && e.ctrlKey)) && isKey(e, 'f');

/**
 * Ctrl+F (Cmd+F on macOS) focuses the playground search from anywhere,
 * before Monaco or the browser see it (PLAN-024 D1, D8). Pressed again in the
 * search input, it is left to the browser's own find. Ctrl+H (Cmd+Alt+F on
 * macOS) does the same for the replace input (PLAN-034 D2). Monaco's own
 * find widget is not loaded (PLAN-034 D6), so nothing else answers them.
 */
export const useSearchShortcut = (
  controller: SearchController,
  input: RefObject<HTMLInputElement | null>,
): void => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mac = isMac();
      let field: 'search' | 'replace';
      if (isReplace(e, mac)) field = 'replace';
      else if (isFind(e, mac)) field = 'search';
      else return;
      if (field === 'search' && input.current && document.activeElement === input.current) return;
      e.preventDefault();
      e.stopPropagation();
      // From within the bar, the query stays (a pane's selection may be its regex's match).
      const inBar = e.target instanceof Element && !!e.target.closest('[role="search"]');
      controller.open(inBar ? undefined : controller.selectionText(), field);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [controller, input]);
};
