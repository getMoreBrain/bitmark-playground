/** @jsxImportSource theme-ui */
import { MouseEvent } from 'react';
import { useSnapshot } from 'valtio';

import { getSearchController, searchState } from '../../search';
import type { SearchController } from '../../search/searchController';
import { activePaneId, countText, tabResultId } from '../../search/searchState';
import type { SearchArea } from '../../search/searchTargets';

export interface SearchCountProps {
  /** The panel the tab is in. */
  area: SearchArea;
  tab: string;
  /** The tab is the one shown in its panel. */
  shown: boolean;
  /** For tests; the playground's own controller by default. */
  controller?: SearchController;
}

/**
 * A tab's match count while searching (PLAN-034 D7): "7", "2/7", highlighted
 * on the pane Next/Previous and Replace act on. Clicking it selects that pane
 * (a hidden tab is shown first) and goes to a match.
 */
const SearchCount = ({ area, tab, shown, controller }: SearchCountProps) => {
  const snap = useSnapshot(searchState);
  if (!snap.open || !snap.query || snap.error) return null;
  const id = tabResultId(area, tab, shown);
  const result = snap.results.find((r) => r.id === id);
  if (!result) return null;
  const active = id === activePaneId(snap.results, snap.activeId);
  const text = countText(result);

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    (controller ?? getSearchController()).select(id);
  };

  return (
    <span
      role="button"
      aria-label={`${result.label}: ${text} matches`}
      aria-current={active ? true : undefined}
      title={
        result.hidden
          ? `${text} matches: show ${result.label}`
          : `${text} matches: step through ${result.label}`
      }
      onClick={onClick}
      sx={{
        ml: 1,
        px: '5px',
        borderRadius: 8,
        fontWeight: 'bold',
        fontStyle: result.hidden ? 'italic' : 'normal',
        color: result.count === 0 ? 'muted' : active ? 'text' : 'searchCount',
        backgroundColor: active ? 'accent' : 'transparent',
        cursor: 'pointer',
        '&:hover': { textDecoration: 'underline' },
      }}
    >
      {text}
    </span>
  );
};

export { SearchCount };
