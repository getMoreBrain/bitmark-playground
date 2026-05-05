---
description: Create or update ARCHITECTURE.md
argument-hint: "<architecture-instructions>"
---

# Create or Update Architecture

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="if exists" />
 <read path=".awa/.agent/schemas/ARCHITECTURE.schema.yaml" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" if="exists" />
<file type="code" required="if reverse workflow" />

## Action

Update or create the architecture document as specified in the instruction above, following awa conventions.

If deriving from existing code (reverse workflow), analyze the codebase to extract architectural patterns, technology stack, and component structure.

## Outputs

<file path=".awa/specs/ARCHITECTURE.md" />

## Rules

You SHALL solidify architecture changes with respect to existing architecture if any.
You SHALL ensure high-level system structure, technology stack, and component relationships.
You SHALL ensure each section of the architecture is addressed.
You SHALL establish architectural rules and constraints.
You SHALL focus on top-level architecture, not design.
You SHOULD keep architecture at a manageable level of detail.
You SHALL support reverse workflow: deriving architecture from existing code when requested.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
