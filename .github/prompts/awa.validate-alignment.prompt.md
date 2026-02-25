---
description: Validate alignment of source with target (check source matches target, and if not list differences)
argument-hint: "<source> [<target>]"
---

# Validate alignment of Source(x) with Target(y)

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/ALIGN_REPORT.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

Format: `<source> [<target>]` where:
- **Source (x)**: The artifact being validated. If not specified, use the last completed work.
- **Target (y)**: The artifact to validate against. If not specified, it is implied according to these rules:

1. x is plan → ask for clarification
2. previous work against a plan → use that plan
3. else → walk UP workflow toward architecture

You **MUST** consider the user input before proceeding (if not empty).

## Definitions

x = source artifact (what is being validated) = design(s).
y = target artifact (what x is validated against) = requirement(s).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="feat" path=".awa/specs/FEAT-{CODE}-{feature-name}.md" required="if relevant" />
<file type="examples" path=".awa/specs/EXAMPLES-{CODE}-{feature-name}-{nnn}.md" required="if relevant" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="api" path=".awa/specs/API-{CODE}-{feature-name}.md" required="if relevant" />
<file type="tasks" path=".awa/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" required="if relevant" />
<file type="plan" path=".awa/plans/PLAN-{nnn}-{plan-name}.md" required="if relevant" />
<file type="code_and_tests" path="various" required="if relevant" />

## Action

Validate that the specified source:x aligns with the target:y, and if not, report all differences.
Follow awa conventions.

## Outputs

<file path=".awa/align/ALIGN-{x}-WITH-{y}-{nnn}.md" />
<cli>STATUS: {PASSED ✅ | FAILED ❌}</cli>

## Rules

You SHALL validate alignment of source:y with target:y.
You SHALL report all differences.
You SHALL consider traceability.
You SHALL report missing trace IDs.
You MAY use todos and tools as needed.

