/** @jsxImportSource theme-ui */
import {
  activePaneId,
  type PaneResult,
  type SearchController,
  type SearchOptions,
  searchOptionShortcut,
} from '@gmb/bitmark-editor';
import { KeyboardEvent, useEffect, useRef } from 'react';
import { Flex, Text } from 'theme-ui';

import {
  getSearchController,
  searchState,
  useSearchShortcut,
  useSearchSnapshot,
} from '../../search';

const OPTION_BUTTONS: readonly { option: keyof SearchOptions; text: string; title: string }[] = [
  { option: 'matchCase', text: 'Aa', title: 'Match case (Alt+C)' },
  { option: 'wholeWord', text: 'ab', title: 'Match whole word (Alt+W)' },
  { option: 'regex', text: '.*', title: 'Use regular expression (Alt+R)' },
];

const buttonSx = (on = false) =>
  ({
    fontFamily: 'monospace',
    fontSize: 1,
    px: '6px',
    py: '2px',
    cursor: 'pointer',
    color: on ? 'text' : 'muted',
    backgroundColor: on ? 'accent' : 'transparent',
    border: '1px solid',
    borderColor: on ? 'accent' : 'transparent',
    borderRadius: 3,
    userSelect: 'none' as const,
    '&:hover': { color: 'primary' },
  }) as const;

/** "No matches", "1 match", "12 matches in 3 panes" (the panes on screen). */
const totalText = (live: readonly PaneResult[]): string => {
  const panes = live.filter((r) => r.count > 0);
  const total = panes.reduce((n, r) => n + r.count, 0);
  const capped = panes.some((r) => r.capped) ? '+' : '';
  if (total === 0) return 'No matches';
  const matches = `${total}${capped} ${total === 1 && !capped ? 'match' : 'matches'}`;
  return panes.length > 1 ? `${matches} in ${panes.length} panes` : matches;
};

export interface SearchBarProps {
  /** For tests; the playground's own controller by default. */
  controller?: SearchController;
}

const inputSx = (invalid = false) =>
  ({
    width: 240,
    fontFamily: 'code',
    fontSize: 1,
    px: 2,
    py: 1,
    color: 'text',
    backgroundColor: 'background',
    border: '1px solid',
    borderColor: invalid ? 'red' : 'accent',
    borderRadius: 3,
    outline: 'none',
    '&:focus': { borderColor: invalid ? 'red' : 'primary' },
  }) as const;

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * The playground search (PLAN-024): one query over every pane on screen,
 * focused with Ctrl+F; each tab shows its own count (`SearchCount`). Always shown, above the panels' tabs (PLAN-034 D1);
 * it highlights while in use, until Escape or ✕. Its replace row (Ctrl+H)
 * replaces in the active pane (PLAN-034 D3).
 */
const SearchBar = (props: SearchBarProps) => {
  const controller = props.controller ?? getSearchController();
  const snap = useSearchSnapshot();
  const input = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  useSearchShortcut(controller, input);

  // Focus on a request made while shown, never on mount (the bar is always shown).
  const seenRequests = useRef(snap.focusRequests);
  useEffect(() => {
    if (snap.focusRequests === seenRequests.current) return;
    seenRequests.current = snap.focusRequests;
    const el = snap.focusField === 'replace' ? replaceInput.current : input.current;
    el?.focus();
    el?.select();
  }, [snap.focusRequests, snap.focusField]);

  // Back in the bar: search again (the query was kept).
  const onFocus = () => {
    if (!searchState.open) searchState.setOpen(true);
  };

  // Escape from anywhere in the bar (the input, a toggle, a count).
  const onBarKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    controller.close();
  };

  // Alt+C, Alt+W, Alt+R; on macOS Cmd+Option with the same keys (the package's).
  const toggleOption = (e: KeyboardEvent<HTMLInputElement>) => {
    const option = searchOptionShortcut(e.nativeEvent);
    if (!option) return false;
    e.preventDefault();
    searchState.toggleOption(option);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      controller.step(e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1);
    } else {
      toggleOption(e);
    }
  };

  // Enter replaces the current match; Ctrl+Alt+Enter (Cmd+Alt+Enter) every match.
  const onReplaceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.altKey && (isMac() ? e.metaKey : e.ctrlKey)) controller.replaceAll();
      else controller.replace();
    } else {
      toggleOption(e);
    }
  };

  const shown = snap.open ? snap.results : [];
  const live = shown.filter((r) => !r.hidden);
  const activeId = activePaneId(shown, snap.activeId);
  const activeResult = live.find((r) => r.id === activeId);
  const replaceBlocked = !activeResult
    ? 'No matches to replace'
    : activeResult.readOnly
      ? `${activeResult.label} is read-only`
      : activeResult.count === 0
        ? `No matches in ${activeResult.label}`
        : undefined;

  return (
    <Flex
      role="search"
      onKeyDown={onBarKeyDown}
      onFocus={onFocus}
      sx={{
        flexDirection: 'column',
        gap: 1,
        px: 2,
        py: 1,
        flexShrink: 0,
        // Stays in view when the stacked layout scrolls the page (PLAN-027 D3).
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'backgroundLight',
        borderBottom: '1px solid',
        borderColor: 'accent',
        fontSize: 1,
      }}
    >
      <Flex sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <button
          type="button"
          title={snap.showReplace ? 'Hide replace' : 'Show replace (Ctrl+H)'}
          aria-label="Toggle replace"
          aria-expanded={snap.showReplace}
          onClick={() => searchState.setShowReplace(!snap.showReplace)}
          sx={{ ...buttonSx(), width: 24 }}
        >
          {snap.showReplace ? '▾' : '▸'}
        </button>
        <input
          ref={input}
          aria-label="Search the playground"
          placeholder="Search (Ctrl+F)"
          value={snap.query}
          onChange={(e) => searchState.setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={snap.error ? true : undefined}
          title={snap.error}
          sx={inputSx(!!snap.error)}
        />
        {OPTION_BUTTONS.map(({ option, text, title }) => (
          <button
            key={option}
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={snap.options[option]}
            onClick={() => searchState.toggleOption(option)}
            sx={buttonSx(snap.options[option])}
          >
            {text}
          </button>
        ))}
        <button
          type="button"
          title="Previous match (Shift+Enter, Shift+F3)"
          aria-label="Previous match"
          onClick={() => controller.step(-1)}
          sx={buttonSx()}
        >
          ↑
        </button>
        <button
          type="button"
          title="Next match (Enter, F3)"
          aria-label="Next match"
          onClick={() => controller.step(1)}
          sx={buttonSx()}
        >
          ↓
        </button>
        <Flex sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, flexGrow: 1 }}>
          {!snap.open ? null : snap.error ? (
            <Text sx={{ color: 'red' }}>Invalid regular expression</Text>
          ) : snap.query && snap.results.length === 0 ? (
            <Text sx={{ color: 'muted' }}>No panes to search</Text>
          ) : snap.query ? (
            // The counts are on the tabs (PLAN-034 D7); here, the total on screen.
            <Text sx={{ color: 'muted' }}>{totalText(live)}</Text>
          ) : null}
        </Flex>
        <label
          sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'muted', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={snap.includeHidden}
            onChange={(e) => searchState.setIncludeHidden(e.target.checked)}
          />
          Hidden tabs
        </label>
        <button
          type="button"
          title="Clear highlights (Escape)"
          aria-label="Close search"
          onClick={() => controller.close()}
          disabled={!snap.open}
          sx={{ ...buttonSx(), visibility: snap.open ? 'visible' : 'hidden' }}
        >
          ✕
        </button>
      </Flex>
      {snap.showReplace ? (
        <Flex sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2, pl: '32px' }}>
          <input
            ref={replaceInput}
            aria-label="Replace"
            placeholder="Replace (Ctrl+H)"
            value={snap.replace}
            onChange={(e) => searchState.setReplace(e.target.value)}
            onKeyDown={onReplaceKeyDown}
            sx={inputSx()}
          />
          <button
            type="button"
            title={replaceBlocked ?? `Replace in ${activeResult?.label} (Enter)`}
            aria-label="Replace"
            disabled={!!replaceBlocked}
            onClick={() => controller.replace()}
            sx={{
              ...buttonSx(),
              fontFamily: 'body',
              '&:disabled': { opacity: 0.5, cursor: 'default' },
            }}
          >
            Replace
          </button>
          <button
            type="button"
            title={replaceBlocked ?? `Replace all in ${activeResult?.label} (Ctrl+Alt+Enter)`}
            aria-label="Replace all"
            disabled={!!replaceBlocked}
            onClick={() => controller.replaceAll()}
            sx={{
              ...buttonSx(),
              fontFamily: 'body',
              '&:disabled': { opacity: 0.5, cursor: 'default' },
            }}
          >
            Replace all
          </button>
        </Flex>
      ) : null}
    </Flex>
  );
};

export { SearchBar };
