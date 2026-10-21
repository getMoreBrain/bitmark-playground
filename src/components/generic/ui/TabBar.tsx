/** @jsxImportSource theme-ui */
import { useEffect, useRef } from 'react';
import { Flex, Text } from 'theme-ui';

export interface Tab<T extends string> {
  id: T;
  label: string;
  /** The tab's last conversion time, in seconds, shown after the label. */
  duration?: number;
}

export interface TabBarProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
}

const formatDuration = (duration: number | undefined): string => {
  if (duration === undefined) return '';
  if (duration >= 1) {
    return ` (${parseFloat(duration.toFixed(3))}s)`;
  }
  const ms = duration * 1000;
  return ` (${parseFloat(ms.toFixed(3))}ms)`;
};

const tabSx = (active: boolean) =>
  ({
    fontSize: 1,
    px: 2,
    py: '4px',
    cursor: 'pointer',
    color: active ? 'primary' : 'muted',
    fontWeight: active ? 'bold' : 'normal',
    backgroundColor: active ? 'backgroundLight' : 'transparent',
    borderTop: '1px solid',
    borderLeft: '1px solid',
    borderRight: '1px solid',
    borderColor: active ? 'accent' : 'transparent',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
    '&:hover': {
      color: 'primary',
    },
  }) as const;

/**
 * Scroll the bar, not the page, so the tab is in view: `scrollIntoView` would
 * also scroll a stacked page to a bar below the fold.
 */
export const revealTab = (
  bar: Pick<HTMLElement, 'offsetLeft' | 'clientWidth' | 'scrollLeft'>,
  tab: Pick<HTMLElement, 'offsetLeft' | 'offsetWidth'>,
): void => {
  const left = tab.offsetLeft - bar.offsetLeft;
  const right = left + tab.offsetWidth;
  if (left < bar.scrollLeft) bar.scrollLeft = left;
  else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = right - bar.clientWidth;
};

/**
 * The tab bar above every panel (PLAN-026 D9). One row that scrolls sideways
 * when it does not fit, keeping the active tab in view (PLAN-027 D6).
 */
const TabBar = <T extends string>({ tabs, activeTab, onTabChange }: TabBarProps<T>) => {
  const barRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  // On a tab change, and when the bar is resized (e.g. across the breakpoint).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const reveal = () => activeRef.current && revealTab(bar, activeRef.current);
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [activeTab]);

  return (
    <Flex
      ref={barRef}
      sx={{
        alignItems: 'flex-end',
        // Never squeezed by tall panel content: a scrolling bar could shrink.
        flexShrink: 0,
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        // A line the active tab's background covers (a border would be
        // clipped from it by the scrolling).
        boxShadow: (t) => `inset 0 -1px 0 ${t.colors?.accent}`,
      }}
    >
      {tabs.map((tab, i) => (
        <Text
          key={tab.id}
          ref={activeTab === tab.id ? activeRef : undefined}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          sx={{ ...tabSx(activeTab === tab.id), ...(i > 0 ? { ml: '2px' } : {}) }}
        >
          {tab.label}
          {formatDuration(tab.duration)}
        </Text>
      ))}
    </Flex>
  );
};

export { TabBar };
