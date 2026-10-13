import { RefObject, useEffect } from 'react';

import type { SearchController } from './searchController';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Ctrl+F (Cmd+F on macOS) opens the playground search from anywhere,
 * before Monaco or the browser see it (PLAN-024 D1, D8). Pressed again in the
 * search input, it is left to the browser's own find.
 */
export const useSearchShortcut = (
  controller: SearchController,
  input: RefObject<HTMLInputElement | null>,
): void => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      if (!mod || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'f') return;
      if (input.current && document.activeElement === input.current) return;
      e.preventDefault();
      e.stopPropagation();
      controller.open(controller.selectionText());
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [controller, input]);
};
