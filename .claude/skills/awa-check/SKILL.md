---
name: awa-check
description: Run traceability and schema checks, then fix any errors. Use this when asked to check, validate, or fix traceability and schema issues.
---

# Run Traceability and Schema Checks

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="code_and_tests" path="various" required="if relevant" />

## Action

Run `awa check` to validate traceability integrity and schema correctness across the project, then analyze and fix any reported errors.

## Process

1. RUN CHECK
   - Execute `awa check` using the project's package manager
   - Capture the full output (errors and warnings)

2. ANALYZE FINDINGS
   - Parse the output for errors (exit code 1) and warnings
   - Group findings by type:
     - **Orphaned markers**: `@awa-impl`, `@awa-test`, or `@awa-component` referencing IDs not found in specs
     - **Broken cross-references**: IMPLEMENTS/VALIDATES pointing to invalid targets
     - **Schema violations**: Missing sections, wrong heading levels, missing content
     - **Uncovered ACs**: Acceptance criteria without corresponding `@awa-test`

3. FIX ERRORS
   - For orphaned markers: locate the marker in code and either fix the ID or add the missing spec entry
   - For broken cross-references: update the DESIGN spec to reference valid REQ IDs
   - For schema violations: update the spec file to match the expected structure
   - For uncovered ACs: add missing `@awa-test` markers or note as intentionally deferred

4. RE-RUN CHECK
   - Execute `awa check` again to verify all errors are resolved
   - Repeat fix cycle until exit code is 0

5. REPORT
   - Summarize what was found and what was fixed
   - Note any remaining warnings that do not block (exit code 0)

## Outputs

<cli>awa check output (text or JSON)</cli>
- Fixed source code files (corrected markers)
- Fixed spec files (corrected cross-references or structure)

## Rules

You SHALL run `awa check` before making any fixes to establish a baseline.
You SHALL fix all errors (severity: error) before completing.
You SHALL re-run `awa check` after fixes to confirm resolution.
You SHALL NOT remove traceability markers to silence errors — fix the root cause instead.
You SHOULD address warnings when straightforward, but warnings do not block completion.
You MAY use `awa check --json` for structured output when analyzing complex results.
You MAY use todos and tools as needed.


