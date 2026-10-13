import { useEffect } from 'react';

import type { JsonTabType } from '../state/bitmarkState';
import { SearchArea, SearchEditor, searchTargets } from './searchTargets';

/**
 * Make an editor searchable while it is mounted (PLAN-024). `hiddenTab`
 * marks a pane that is mounted but not shown: searched only as a hidden tab.
 */
export const useSearchTarget = (
  area: SearchArea,
  label: string,
  editor: SearchEditor | undefined,
  hiddenTab?: JsonTabType,
): void => {
  useEffect(() => {
    if (!editor) return;
    return searchTargets.register({ area, label, editor, hiddenTab });
  }, [area, label, editor, hiddenTab]);
};
