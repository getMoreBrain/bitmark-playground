---
name: zen-refactor
description: Refactor code or docs while preserving behavior, meaning, and traceability. Use this when asked to refactor, restructure, or improve code quality.
---

# Refactor Code

## Bootstrap

<tool name="read_file">
 <read path=".zen/.agent/zen.core.md" required="true" error="on not found" />
 <read path=".zen/rules/*.md" required="true" />
 <read path=".zen/specs/ARCHITECTURE.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".zen/specs/ARCHITECTURE.md" />
<file type="requirements" path=".zen/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".zen/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="api" path=".zen/specs/API-{CODE}-{feature-name}.md" required="if relevant" />
<file type="tasks" path=".zen/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" required="if relevant" />
<file type="code" required="if relevant" />

## Action

Refactor the specified cod or docs as instructed, following Zen conventions.

## Outputs

- Refactored source code files with preserved markers
- Updated test files if structure changed
- Refactored documentation

## Rules

You SHALL preserve existing behavior unless explicitly asked to change it.
You SHALL maintain all traceability markers (@zen-component, @zen-impl, @zen-test).
You SHALL ensure tests pass before and after refactoring.
You SHALL make incremental changes, not wholesale rewrites.
You SHALL NOT change public interfaces without explicit approval.
You SHALL clarify scope and risks with user before major refactors.
You MAY use todos and tools as needed.
