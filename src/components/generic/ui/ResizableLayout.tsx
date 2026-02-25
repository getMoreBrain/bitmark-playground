// @awa-component: PLAN-003-ResizableLayout
/** @jsxImportSource theme-ui */
import { useCallback, useRef } from 'react';
import { Box, Flex } from 'theme-ui';

export interface ResizableLayoutProps {
  /** Content for the top section */
  top: React.ReactNode;
  /** Content for the bottom section */
  bottom: React.ReactNode;
  /** Bottom panel height in pixels */
  bottomHeight: number;
  /** Whether the bottom panel is collapsed */
  collapsed: boolean;
  /** Called when the user drags to resize */
  onHeightChange: (height: number) => void;
  /** Called when the user toggles collapse */
  onToggleCollapse: () => void;
}

const MIN_BOTTOM_HEIGHT = 80;
const MAX_BOTTOM_RATIO = 0.7;

// @awa-impl: PLAN-003-Step3 (resizable layout)
const ResizableLayout = ({
  top,
  bottom,
  bottomHeight,
  collapsed,
  onHeightChange,
  onToggleCollapse,
}: ResizableLayoutProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (collapsed) return;
      e.preventDefault();
      dragging.current = true;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
    },
    [collapsed],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxHeight = containerRect.height * MAX_BOTTOM_RATIO;
      const newHeight = containerRect.bottom - e.clientY;
      const clamped = Math.max(MIN_BOTTOM_HEIGHT, Math.min(maxHeight, newHeight));
      onHeightChange(clamped);
    },
    [onHeightChange],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    onToggleCollapse();
  }, [onToggleCollapse]);

  return (
    <Flex
      ref={containerRef}
      sx={{
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Top section */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {top}
      </Box>

      {/* Drag handle */}
      <Box
        role="separator"
        aria-orientation="horizontal"
        aria-label={collapsed ? 'Expand bottom panels' : 'Resize bottom panels'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        sx={{
          height: '6px',
          cursor: 'row-resize',
          backgroundColor: 'accent',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s',
          '&:hover': {
            backgroundColor: 'primary',
          },
        }}
      >
        {/* Chevron indicator */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          sx={{
            color: 'muted',
            fontSize: '10px',
            lineHeight: 1,
            cursor: 'pointer',
            userSelect: 'none',
            '&:hover': { color: 'text' },
          }}
        >
          {collapsed ? '▲' : '▼'}
        </Box>
      </Box>

      {/* Bottom section */}
      {!collapsed && (
        <Box
          sx={{
            height: `${bottomHeight}px`,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {bottom}
        </Box>
      )}
    </Flex>
  );
};

export { ResizableLayout };
