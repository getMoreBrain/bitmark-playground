---
description: Create or update feature context documents
argument-hint: "<feature-instructions>"
---

# Create or Update Feature Context

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/FEAT.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="feat" path=".awa/specs/FEAT-{CODE}-{feature-name}.md" required="if updating" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="code" required="if reverse workflow" />

## Action

Create or update a non-normative feature context document as specified in the instruction above, following awa conventions.

If deriving from existing code or requirements (reverse workflow), analyze the codebase and specs to extract the problem statement, conceptual model, and usage scenarios.

## Outputs

<file path=".awa/specs/FEAT-{CODE}-{feature-name}.md" />

## Rules

You SHALL describe the problem, motivation, and conceptual model for the feature.
You SHALL provide concrete usage scenarios that illustrate the feature in action.
You SHALL mark the document as INFORMATIVE (not normative).
You SHALL NOT use normative language (SHALL/SHOULD/MAY) — that belongs in REQ documents.
You SHALL NOT define acceptance criteria or traceability IDs — that belongs in REQ documents.
You SHALL NOT describe design decisions or implementation details — that belongs in DESIGN documents.
You SHALL ensure the {CODE} matches the corresponding REQ {CODE} for the same feature.
You SHALL use clear, accessible language; define jargon in a glossary if needed.
You SHALL support reverse workflow: deriving feature context from existing code or requirements when requested.
You SHALL clarify open points with user.
You MAY include diagrams, background, and non-normative notes as needed.
You MAY use todos and tools as needed.
