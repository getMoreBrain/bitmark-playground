---
description: Create or update requirements documents
argument-hint: "<requirements-instructions>"
---

# Create or Update Requirements

## Bootstrap

<tool name="read_file">
 <read path=".zen/.agent/zen.core.md" required="true" error="on not found" />
 <read path=".zen/rules/*.md" required="true" />
 <read path=".zen/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".zen/.agent/schemas/REQ.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".zen/specs/ARCHITECTURE.md" />
<file type="requirements" path=".zen/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="code" required="if reverse workflow" />

## Action

Update or create the requirements document(s) as specified in the instruction above, following Zen conventions.

If deriving from existing code (reverse workflow), analyze the codebase to extract implicit requirements, acceptance criteria, and behavioral expectations.

## Outputs

<file path=".zen/specs/REQ-{CODE}-{feature-name}.md" />

## Rules

You SHALL solidify requirements with respect to architecture and existing requirements.
You SHALL create set of requirements in EARS format (INCOSE-compliant) based on the feature idea.
You SHALL identify existing requirements to update, or new requirements to create.
You SHALL consider edge cases, UX, technical constraints, success criteria.
You SHALL ensure the 3-letter {CODE} used in the filename is unique within the project.
You SHOULD focus on requirements which will later be turned into a design.
You SHOULD keep requirements at a manageable level of detail.
You SHALL support reverse workflow: deriving requirements from existing code when requested.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
