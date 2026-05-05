---
description: Upgrade specs to match current schemas
argument-hint: "[<upgrade-instructions>]"
---

# Upgrade Specs to Current Schemas

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/ARCHITECTURE.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/FEAT.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/EXAMPLE.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/REQ.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/DESIGN.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/TASK.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/PLAN.schema.yaml" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/ALIGN_REPORT.schema.yaml" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="feat" path=".awa/specs/FEAT-{CODE}-{feature-name}.md" required="if exists" />
<file type="examples" path=".awa/specs/EXAMPLE-{CODE}-{feature-name}-{nnn}.md" required="if exists" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if exists" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if exists" />
<file type="api" path=".awa/specs/API-{CODE}-{feature-name}.md" required="if exists" />
<file type="tasks" path=".awa/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" required="if exists" />
<file type="plan" path=".awa/plans/PLAN-{nnn}-{plan-name}.md" required="if exists" />
<file type="align_report" path=".awa/alignment/ALIGN-{x}-WITH-{y}-{nnn}.md" required="if exists" />
<file type="code" required="if relevant" />


## Action

Upgrade the specified specs to conform to their schemas and traceability rules.

1) ORIENT: Confirm which artifacts to upgrade; clarify missing targets.
2) CHECK: Run `awa check` in the terminal to identify schema violations and traceability errors across all target files. Parse the output to build a list of findings to fix.
3) FIX: For each reported error, edit the file to resolve the violation — fix section structure, heading levels, missing required content, prohibited patterns, and broken trace IDs.
4) RECHECK: Run `awa check` again to verify all errors are resolved. Repeat FIX → RECHECK until the check passes cleanly (warnings and info findings are acceptable).
5) REPORT: Summarize changes and remaining questions before finalizing.

## Outputs

- Updated spec(s) and supporting templates (as applicable)

## Rules

You SHALL avoid destructive edits; propose clarifications when unsure.
You SHALL follow schema structure strictly (section order, nesting).
You SHALL obey schema render expectations (omit optional empty sections, avoid prohibited patterns).
You SHALL upgrade existing trace IDs if necessary.
You SHALL upgrade existing filenames if necessary.
You SHALL respect the file line-limits; split logically if needed.
You MAY use todos and tools as needed.
