---
name: awa-examples
description: Create or update usage examples for a feature. Use this when asked to provide detailed code examples, CLI demonstrations, or configuration samples.
---

# Create or Update Usage Examples

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="if exists" />
 <read path=".awa/.agent/schemas/EXAMPLES.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="feat" path=".awa/specs/FEAT-{CODE}-{feature-name}.md" required="if relevant" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="examples" path=".awa/specs/EXAMPLES-{CODE}-{feature-name}-{nnn}.md" required="if updating" />
<file type="code" required="if relevant" />

## Action

Create or update concrete usage examples for a feature as specified in the instruction above, following awa conventions.

If deriving from existing code (reverse workflow), extract representative usage patterns, CLI invocations, and configuration samples.

## Outputs

<file path=".awa/specs/EXAMPLES-{CODE}-{feature-name}-{nnn}.md" />

## Rules

You SHALL provide concrete, detailed, reproducible examples (code, CLI, config).
You SHALL include context for each example explaining when to use it and what it demonstrates.
You SHALL use the same {CODE} as the corresponding FEAT/REQ for the feature.
You SHALL mark the document as INFORMATIVE (not normative).
You SHALL split into multiple files (-001, -002, ...) if a single file would exceed 500 lines.
You SHALL NOT use normative language (SHALL/SHOULD/MAY) — that belongs in REQ documents.
You SHALL NOT define acceptance criteria or traceability IDs — that belongs in REQ documents.
You SHALL NOT describe design decisions or implementation details — that belongs in DESIGN documents.
You SHALL support reverse workflow: extracting examples from existing code when requested.
You SHALL clarify open points with user.
You MAY include prerequisites, expected output, and notes for each example.
You MAY create examples proactively when detailed demonstrations would aid understanding.
You MAY use todos and tools as needed.
