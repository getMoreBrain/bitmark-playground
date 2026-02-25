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
 <read path=".awa/.agent/schemas/ARCHITECTURE.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/FEAT.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/EXAMPLES.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/REQ.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/DESIGN.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/TASK.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/PLAN.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="feat" path=".awa/specs/FEAT-{CODE}-{feature-name}.md" required="if exists" />
<file type="examples" path=".awa/specs/EXAMPLES-{CODE}-{feature-name}-{nnn}.md" required="if exists" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if exists" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if exists" />
<file type="api" path=".awa/specs/API-{CODE}-{feature-name}.md" required="if exists" />
<file type="tasks" path=".awa/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" required="if exists" />
<file type="plan" path=".awa/plans/PLAN-{nnn}-{plan-name}.md" required="if exists" />
<file type="code" required="if relevant" />


## Action

Upgrade the specified specs to conform to their schemas and traceability rules.

1) ORIENT: Confirm which artifacts to upgrade; clarify missing targets.
2) AUDIT: Compare each document to its schema; rely on the schema for section structure, required/optional fields, and prohibited patterns.
3) ALIGN: Update IDs and code refs to match schema patterns and current agent/code context (requirements, criteria, properties, tasks, components, trace markers). Adjust content to satisfy schema expectations.
4) TRACEABILITY: Preserve and update code ref markers and any trace matrices when IDs change.
5) VALIDATE: Re-scan against schemas; avoid empty placeholders; keep files under 500 lines.
6) REPORT: Summarize changes and remaining questions before finalizing.

## Outputs

- Updated spec(s) and supporting templates (as applicable)

## Rules

You SHALL avoid destructive edits; propose clarifications when unsure.
You SHALL add to any change log sections as needed.
You SHALL follow schema structure strictly (section order, nesting).
You SHALL obey schema render expectations (omit optional empty sections, avoid prohibited patterns).
You SHALL upgrade existing trace IDs if necessary.
You SHALL upgrade existing filenames if necessary.
You SHALL respect the 500-line limit; split logically if needed.
You MAY use todos and tools as needed.
