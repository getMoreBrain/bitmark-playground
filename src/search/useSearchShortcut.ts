import { attachSearchShortcut, type SearchController } from '@gmb/bitmark-editor';
import { RefObject, useEffect } from 'react';

/**
 * The search's keys, the package's (PLAN-036 D2), from anywhere and before
 * Monaco or the browser see them (PLAN-024 D1, D8): Ctrl+F (Cmd+F on macOS)
 * focuses the search and Ctrl+H (Cmd+Alt+F) its replace input (PLAN-034
 * D2); F3 and Shift+F3 step. Ctrl+F pressed again in the search input is
 * left to the browser's own find. Monaco's own find widget is not loaded
 * (PLAN-034 D6), so nothing else answers them.
 */
export const useSearchShortcut = (
  controller: SearchController,
  input: RefObject<HTMLInputElement | null>,
): void => {
  useEffect(
    () =>
      attachSearchShortcut(controller, {
        input: () => input.current,
        bar: () => input.current?.closest('[role="search"]'),
      }),
    [controller, input],
  );
};
