---
description: Create or update design documents
argument-hint: "<design-instruction>"
---

# Create or Update Design(s)

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/DESIGN.schema.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/REQ.schema.md" optional="true" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="feat" path=".awa/specs/FEAT-{CODE}-{feature-name}.md" required="if relevant" />
<file type="examples" path=".awa/specs/EXAMPLES-{CODE}-{feature-name}-{nnn}.md" required="if relevant" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="api" path=".awa/specs/API-{CODE}-{feature-name}.md" required="if relevant" />
<file type="code" required="if reverse workflow" />

## Action

Update or create the design document(s) as specified in the instruction above, following awa conventions.

If deriving from existing code (reverse workflow), analyze the codebase to extract component structure, interfaces, data models, and design patterns.

## Outputs

<file path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" />
<file path=".awa/specs/API-{CODE}-{api-name}.tsp" />

## Rules

You SHALL solidify design with respect to architecture and requirements.
You SHALL create and maintain design specifications for features.
You SHALL create and maintain API specifications in TypeSpec format.
You SHALL define component interfaces, data models, and error handling strategies.
You SHALL identify existing requirements to update, or new requirements to create.
You SHALL consider edge cases, UX, technical constraints, success criteria.
You MUST identify areas where research is needed based on the feature requirements.
You MUST conduct research and build up context in the conversation thread.
You SHALL ensure the 3-letter {CODE} used in the filename is unique within the project.
You SHALL support reverse workflow: deriving design from existing code when requested.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
