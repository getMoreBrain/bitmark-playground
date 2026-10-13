/** @jsxImportSource theme-ui */
import { KeyboardEvent, useEffect, useRef } from 'react';
import { Flex, Text } from 'theme-ui';
import { useSnapshot } from 'valtio';

import { getSearchController, searchState, useSearchShortcut } from '../../search';
import { SearchOptions } from '../../search/findAll';
import type { SearchController } from '../../search/searchController';
import { countText } from '../../search/searchState';

const OPTION_BUTTONS: readonly { option: keyof SearchOptions; text: string; title: string }[] = [
  { option: 'matchCase', text: 'Aa', title: 'Match case (Alt+C)' },
  { option: 'wholeWord', text: 'ab', title: 'Match whole word (Alt+W)' },
  { option: 'regex', text: '.*', title: 'Use regular expression (Alt+R)' },
];

const OPTION_KEYS: Record<string, keyof SearchOptions> = {
  c: 'matchCase',
  w: 'wholeWord',
  r: 'regex',
};

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

export interface SearchBarProps {
  /** For tests; the playground's own controller by default. */
  controller?: SearchController;
}

/**
 * The playground search (PLAN-024): one query over every pane on screen,
 * opened with Ctrl+F. Shown only while open.
 */
const SearchBar = (props: SearchBarProps) => {
  const controller = props.controller ?? getSearchController();
  const snap = useSnapshot(searchState);
  const input = useRef<HTMLInputElement>(null);
  useSearchShortcut(controller, input);

  useEffect(() => {
    if (!snap.open) return;
    input.current?.focus();
    input.current?.select();
  }, [snap.open, snap.focusRequests]);

  if (!snap.open) return null;

  // Escape from anywhere in the bar (the input, a toggle, a count).
  const onBarKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    controller.close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      controller.step(e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1);
    } else if (e.altKey && OPTION_KEYS[e.key.toLowerCase()]) {
      e.preventDefault();
      searchState.toggleOption(OPTION_KEYS[e.key.toLowerCase()]);
    }
  };

  const live = snap.results.filter((r) => !r.hidden);
  const hidden = snap.results.filter((r) => r.hidden);
  const activeId = snap.activeId ?? live.find((r) => r.id === 'left')?.id ?? live[0]?.id;

  return (
    <Flex
      role="search"
      onKeyDown={onBarKeyDown}
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        px: 2,
        py: 1,
        flexShrink: 0,
        backgroundColor: 'backgroundLight',
        borderBottom: '1px solid',
        borderColor: 'accent',
        fontSize: 1,
      }}
    >
      <input
        ref={input}
        aria-label="Search the playground"
        placeholder="Search"
        value={snap.query}
        onChange={(e) => searchState.setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        aria-invalid={snap.error ? true : undefined}
        title={snap.error}
        sx={{
          width: 240,
          fontFamily: 'code',
          fontSize: 1,
          px: 2,
          py: 1,
          color: 'text',
          backgroundColor: 'background',
          border: '1px solid',
          borderColor: snap.error ? 'red' : 'accent',
          borderRadius: 3,
          outline: 'none',
          '&:focus': { borderColor: snap.error ? 'red' : 'primary' },
        }}
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
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
        onClick={() => controller.step(-1)}
        sx={buttonSx()}
      >
        ↑
      </button>
      <button
        type="button"
        title="Next match (Enter)"
        aria-label="Next match"
        onClick={() => controller.step(1)}
        sx={buttonSx()}
      >
        ↓
      </button>
      <Flex sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, flexGrow: 1 }}>
        {snap.error ? (
          <Text sx={{ color: 'red' }}>Invalid regular expression</Text>
        ) : snap.query && snap.results.length === 0 ? (
          <Text sx={{ color: 'muted' }}>No panes to search</Text>
        ) : (
          [...live, ...hidden].map((r) => (
            <button
              key={r.id}
              type="button"
              title={r.hidden ? `Show ${r.label}` : `Step through ${r.label}`}
              aria-current={r.id === activeId ? true : undefined}
              onClick={() => controller.select(r.id)}
              sx={{
                ...buttonSx(r.id === activeId),
                fontFamily: 'body',
                fontStyle: r.hidden ? 'italic' : 'normal',
                opacity: r.hidden ? 0.7 : 1,
                color: r.count === 0 ? 'muted' : r.id === activeId ? 'text' : 'primary',
              }}
            >
              {r.label}{' '}
              <span sx={{ color: r.count === 0 ? 'muted' : 'searchCount', fontWeight: 'bold' }}>
                {countText(r)}
              </span>
            </button>
          ))
        )}
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
        title="Close (Escape)"
        aria-label="Close search"
        onClick={() => controller.close()}
        sx={buttonSx()}
      >
        ✕
      </button>
    </Flex>
  );
};

export { SearchBar };
