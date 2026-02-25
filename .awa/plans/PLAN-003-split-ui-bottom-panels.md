# PLAN-003: Split UI — Bottom Output Panels

**Status:** in-progress
**Workflow direction:** top-down
**Traceability:** Standalone UI enhancement; no existing REQ/DESIGN artifacts.

---

## Goal

Add a second row of panels below the existing editor panels. The bottom row mirrors the top row's two-panel layout, each with its own tab bar ("Diff" / "Lexer"). The two rows are separated by a thin draggable resize handle. The bottom row is hidden by default and toggled via a settings menu. When visible, it is resizable and collapsible. A settings menu (cog icon, top-right) controls UI preferences.

## Current Layout

```
┌────────────────┬────────────────┐
│  TabBar(markup) │  TabBar(JSON)  │
│                │                │
│  Markup Editor │  JSON Editor   │
│                │                │
├────────────────┴────────────────┤
│  Version          Copyright     │
└─────────────────────────────────┘
```

## Target Layout

With "Show diff / lex" enabled and bottom row expanded:

```
┌────────────────┬────────────────⚙┐  ← cog icon top-right
│  TabBar(markup) │  TabBar(JSON)    │
│                │                  │
│  Markup Editor │  JSON Editor     │
│                │                  │
├═══════════ drag handle ═══════════┤  ← thin, horizontal, draggable
│  TabBar(Diff…) │  TabBar(Diff…)   │
│                │                  │
│  (empty panel) │  (empty panel)   │
│                │                  │
├────────────────┴──────────────────┤
│  Version            Copyright     │
└───────────────────────────────────┘
```

With "Show diff / lex" enabled and bottom row collapsed:

```
┌────────────────┬────────────────⚙┐
│  TabBar(markup) │  TabBar(JSON)    │
│                │                  │
│  Markup Editor │  JSON Editor     │
│                │                  │
├═ drag handle / toggle ════════════┤
├────────────────┴──────────────────┤
│  Version            Copyright     │
└───────────────────────────────────┘
```

With "Show diff / lex" disabled (default):

```
┌────────────────┬────────────────⚙┐
│  TabBar(markup) │  TabBar(JSON)    │
│                │                  │
│  Markup Editor │  JSON Editor     │
│                │                  │
├────────────────┴──────────────────┤
│  Version            Copyright     │
└───────────────────────────────────┘
```

### Settings Menu (dropdown from ⚙)

```
┌─────────────────┐
│  Settings        │
│─────────────────│
│  UI              │
│  Show diff / lex [ ] │
│                  │
│  (future items)  │
└─────────────────┘
```

## Steps

### Step 1 — Create settings state (`uiState`)

- New file: `src/state/uiState.ts`
- Valtio proxy with:
  - `showDiffLex: boolean` (default `false`) — controls bottom panel visibility
  - `bottomPanelHeight: number` (default `250`) — remembered height for restore
  - `bottomPanelCollapsed: boolean` (default `false`) — collapsed vs expanded when visible
  - `leftOutputTab: string` (default `'diff'`)
  - `rightOutputTab: string` (default `'diff'`)
  - `settingsOpen: boolean` (default `false`) — dropdown open/closed
- Setter methods for each field
- Consumers read via `useSnapshot(uiState)`

### Step 2 — Create `SettingsMenu` component

- New file: `src/components/generic/ui/SettingsMenu.tsx`
- Renders a cog icon (⚙ or SVG) button, positioned top-right of the app header area
- On click: toggles a dropdown panel anchored below the icon
- Dropdown contents:
  - Section header: "UI"
  - Checkbox: "Show diff / lex" — bound to `uiState.showDiffLex`
- Click outside or press Escape closes the dropdown
- Styling: dark background matching app theme, accent borders, consistent typography

### Step 3 — Create `ResizableLayout` component

- New file: `src/components/generic/ui/ResizableLayout.tsx`
- Renders two vertical sections (top / bottom) inside a flex column
- Accepts `children` as top and bottom content (e.g. via named slots or array)
- Manages `bottomHeight` state (pixels or percentage); default = 0 (collapsed)
- Thin horizontal drag handle between sections (~4–6px, styled as accent border)
  - Cursor: `row-resize` on hover
  - On drag: update `bottomHeight` via `onPointerDown` / `onPointerMove` / `onPointerUp`
  - Clamp min height (e.g. 80px when open) and max (e.g. 70% of container)
- Toggle affordance: double-click or a small chevron button on the handle to collapse/expand
  - Collapse → `bottomHeight = 0`, expand → restore previous height (or sensible default like 30%)
- When collapsed, bottom section renders nothing (or is `display: none`)

### Step 4 — Create `OutputTabBar` component

- New file: `src/components/generic/ui/OutputTabBar.tsx`
- Props: `label: string`, `tabs: { id: string; label: string }[]`, `activeTab: string`, `onTabChange: (id: string) => void`
- Generic tab bar (reusable), visually consistent with `ParserTabBar`
- Shares the same styling pattern (active/inactive tab styles)
- Initial tabs: `[{ id: 'diff', label: 'Diff' }, { id: 'lexer', label: 'Lexer' }]`

### Step 5 — Create `OutputPanel` component

- New file: `src/components/generic/ui/OutputPanel.tsx`
- Wraps `OutputTabBar` + a content area (empty `Flex` placeholder for now)
- Manages its own `activeTab` state (default: `'diff'`)
- Content area renders nothing — just a styled container with `flexGrow: 1`, matching editor panel aesthetics (dark background, accent border)

### Step 6 — Integrate into `App.tsx`

- Add `SettingsMenu` to the top bar area, positioned right of the JSON `ParserTabBar`, aligned right
- Conditionally render `ResizableLayout` wrapping editors + bottom panels only when `uiState.showDiffLex` is `true`; otherwise render editors at full height (current behavior)
- Top slot: existing `<Flex flexDirection="row">` with markup + JSON editors (unchanged)
- Bottom slot: new `<Flex flexDirection="row">` with two `OutputPanel` instances
  - Left panel label: "bitmark" (mirrors left editor)
  - Right panel label: "JSON" (mirrors right editor)
- Status bar remains outside/below `ResizableLayout`

### Step 7 — Styling & polish

- Drag handle: subtle accent color, slight highlight on hover
- Smooth transition when collapsing/expanding (optional CSS transition on height)
- Bottom panels match editor panel styling (background, border colors)
- Responsive: if viewport is very short, bottom panels should not crowd editors
- Tab bar labels have no duration display (unlike `ParserTabBar`)

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Drag performance on rapid pointermove | Use `requestAnimationFrame` or pointer capture; avoid re-rendering editors during drag |
| Monaco editors may not auto-resize when top row shrinks | Existing `ResizeObserver` in Monaco wrapper should handle this; verify |
| State sprawl | Dedicated `uiState` proxy; separate from `bitmarkState` |
| Settings menu z-index | Ensure dropdown renders above editors (Monaco has high z-index); use portal or high z-index |
| Click-outside detection | Use `useEffect` with document click listener; clean up on unmount |
| Accessibility | Drag handle should be keyboard-operable (arrow keys) and have `role="separator"` with `aria-orientation="horizontal"` |

## Completion Criteria

- [ ] Cog icon visible top-right, opens settings dropdown
- [ ] Settings dropdown has "UI" section with "Show diff / lex" checkbox
- [ ] Bottom row hidden by default (setting off)
- [ ] Toggling "Show diff / lex" shows/hides bottom row + drag handle
- [ ] Drag handle resizes top/bottom rows when bottom is visible
- [ ] Double-click or chevron collapses/expands bottom row
- [ ] Each bottom panel has "Diff" and "Lexer" tabs (switchable, content empty)
- [ ] Status bar remains at the very bottom
- [ ] Existing editor functionality is unaffected
- [ ] Monaco editors resize correctly when row heights change
- [ ] Settings dropdown closes on click-outside or Escape

## Out of Scope

- Diff content rendering
- Lexer output rendering
- Any parser or conversion logic for bottom panels
- Additional settings beyond "Show diff / lex"
