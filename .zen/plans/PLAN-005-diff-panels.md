# PLAN-005: Diff Panels — Coloured Diffs (Original vs WASM)

**Status:** in-progress
**Workflow direction:** top-down
**Traceability:** Extends PLAN-003 (bottom output panels); consumes `bitmarkState` per-parser slices (PLAN-002).

---

## Goal

Populate the "Diff" tab in each bottom output panel with a coloured diff view using Monaco's built-in diff editor. The left panel shows the diff between the JS ("Original") and WASM parser **bitmark markup** outputs. The right panel shows the diff between the JS and WASM parser **JSON** outputs.

## Context

- PLAN-003 created the bottom output panels with "Diff" / "Lexer" tabs (content currently empty).
- PLAN-002 established per-parser state slices (`bitmarkState.js`, `.wasm`, `.wasmFull`) each containing `markup` and `jsonAsString`.
- `react-monaco-editor` already exports `MonacoDiffEditor` — wraps `monaco.editor.createDiffEditor`.
- The existing `MonacoEditorAutoResize` class component handles container-resize → editor-resize via `ResizeObserver`.

## Diff Content Mapping

| Panel | Original (left side) | Modified (right side) | Language |
|-------|---------------------|-----------------------|----------|
| Left ("bitmark") | `bitmarkState.js.markup` | `bitmarkState.wasm.markup` | `bitmark` |
| Right ("JSON") | `bitmarkState.js.jsonAsString` | `bitmarkState.wasm.jsonAsString` | `json` |

The diff editors are **read-only** — users cannot edit content in these panels.

## Target Layout (bottom panel, "Diff" tab active)

```
┌──────────────────────────────┬──────────────────────────────┐
│  Diff ◉ | Lexer ○   bitmark │  Diff ◉ | Lexer ○   JSON    │
├──────────────────────────────┼──────────────────────────────┤
│  Monaco DiffEditor           │  Monaco DiffEditor           │
│  original: JS markup         │  original: JS JSON           │
│  modified: WASM markup       │  modified: WASM JSON         │
│  (inline diff, read-only)    │  (inline diff, read-only)    │
└──────────────────────────────┴──────────────────────────────┘
```

## Steps

### Step 1 — Create `MonacoDiffEditorAutoResize` component

- New file: `src/components/monaco/MonacoDiffEditorAutoResize.tsx`
- Mirrors `MonacoEditorAutoResize` but wraps `MonacoDiffEditor` from `react-monaco-editor`
- Uses `ResizeObserver` to track container dimensions and pass `width`/`height` to the diff editor
- Props: extends `MonacoDiffEditorProps` (from `react-monaco-editor`)
- Functional component with hooks (unlike the class-based original — modernize the pattern)

### Step 2 — Create `DiffPanel` component

- New file: `src/components/bitmark/DiffPanel.tsx`
- Props:
  - `original: string` — left side content (JS parser output)
  - `modified: string` — right side content (WASM parser output)
  - `language: string` — Monaco language id (`'bitmark'` or `'json'`)
- Renders `MonacoDiffEditorAutoResize` with:
  - `original` and `value` (modified) props
  - `theme="vs-dark"`
  - `options`:
    - `readOnly: true` — no editing
    - `renderSideBySide: false` — inline diff (saves space in bottom panel; could be toggled later)
    - `minimap: { enabled: false }` — save space
    - `scrollBeyondLastLine: false`
    - `wordWrap: 'on'`
    - `renderOverviewRuler: false`
  - `language` prop

### Step 3 — Wire `DiffPanel` into `OutputPanel`

- Modify `OutputPanel.tsx`:
  - Add new props: `original: string`, `modified: string`, `language: string`
  - When `activeTab === 'diff'`, render `<DiffPanel original={original} modified={modified} language={language} />`
  - When `activeTab === 'lexer'`, continue rendering empty placeholder
- Pass `flexGrow: 1` and `minHeight: 0` to the diff content container to fill available space

### Step 4 — Wire state data in `App.tsx`

- Update `bottomPanels` in `App.tsx`:
  - Left `OutputPanel`:
    - `original={snap.js.markup}`
    - `modified={snap.wasm.markup}`
    - `language="bitmark"`
  - Right `OutputPanel`:
    - `original={snap.js.jsonAsString}`
    - `modified={snap.wasm.jsonAsString}`
    - `language="json"`

### Step 5 — Update test mock

- Update `src/test/__mocks__/react-monaco-editor.tsx` to ensure `MonacoDiffEditor` mock is adequate for new test scenarios (it already exists, verify props are forwarded)

### Step 6 — Unit tests

- New file: `src/components/bitmark/DiffPanel.test.tsx`
  - Test that `DiffPanel` renders a `MonacoDiffEditor` with the expected props
  - Test `original` and `modified` values are correctly passed through
  - Test read-only and inline-diff options are applied
- Update `src/components/generic/ui/ui-components.test.tsx` (or new file):
  - Test that `OutputPanel` renders `DiffPanel` when `activeTab === 'diff'`
  - Test that `OutputPanel` renders placeholder when `activeTab === 'lexer'`

## Risks & Considerations

| Risk | Mitigation |
|------|-----------|
| Monaco diff editor may not auto-resize properly within resizable layout | `MonacoDiffEditorAutoResize` uses `ResizeObserver`; verify it works after drag-resize |
| Inline diff may be hard to read for large differences | Start with inline; consider adding side-by-side toggle in future |
| Performance with large bitmark/JSON outputs | Monaco diff is lazy; should handle well. Monitor. |
| WASM parser `generate()` not implemented → markup diff shows error string | Acceptable: the diff will show the error message vs JS output, making the limitation visible |
| Tree-sitter highlighting not available in diff editor for bitmark language | Monaco diff editor uses standard tokenizers; bitmark syntax highlighting may be limited to plain text in diff view. Acceptable for now. |

## Completion Criteria

- [ ] "Diff" tab in left bottom panel shows coloured inline diff of JS vs WASM bitmark markup
- [ ] "Diff" tab in right bottom panel shows coloured inline diff of JS vs WASM JSON
- [ ] Diff editors are read-only
- [ ] Diff editors auto-resize when bottom panel is resized via drag handle
- [ ] Diff content updates reactively when parser outputs change (e.g. user edits markup)
- [ ] Monaco dark theme applied to diff editors
- [ ] "Lexer" tab still shows empty placeholder (unchanged)
- [ ] Existing editor functionality unaffected

## Out of Scope

- Side-by-side vs inline diff toggle
- Lexer tab content
- Diff between wasmFull and other parsers
- Tree-sitter syntax highlighting in diff editors
