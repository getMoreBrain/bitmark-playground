---
name: zen-architecture
description: Create or update ARCHITECTURE.md. Use this when asked to create, update or modify the project architecture.
---

# Create or Update Architecture

## Bootstrap

<tool name="read_file">
 <read path=".zen/.agent/zen.core.md" required="true" error="on not found" />
 <read path=".zen/rules/*.md" required="true" />
 <read path=".zen/specs/ARCHITECTURE.md" required="if exists" />
 <read path=".zen/.agent/schemas/ARCHITECTURE.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".zen/specs/ARCHITECTURE.md" if="exists" />
<file type="code" required="if reverse workflow" />

## Action

Update or create the architecture document as specified in the instruction above, following Zen conventions.

If deriving from existing code (reverse workflow), analyze the codebase to extract architectural patterns, technology stack, and component structure.

## Outputs

<file path=".zen/specs/ARCHITECTURE.md" />

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
