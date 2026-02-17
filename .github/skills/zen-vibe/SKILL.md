---
name: zen-vibe
description: Implement an idea from start to finish using the full Zen workflow. Use this when asked to take an idea through the complete development cycle.
---

# Vibe: Idea to Implementation

## Bootstrap

<tool name="read_file">
 <read path=".zen/.agent/zen.core.md" required="true" error="on not found" />
 <read path=".zen/rules/*.md" required="true" />
 <read path=".zen/specs/ARCHITECTURE.md" required="if exists" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".zen/specs/ARCHITECTURE.md" />
<file type="requirements" path=".zen/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".zen/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="api" path=".zen/specs/API-{CODE}-{feature-name}.md" required="if relevant" />
<file type="tasks" path=".zen/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" required="if relevant" />
<file type="code" required="if relevant" />

## Action

Take an idea from concept to working implementation, flowing through the Zen workflow in the standard direction.

## Process

1. UNDERSTAND: Clarify idea, scope, constraints. Determine starting point.
2. Flow through stages, creating/updating specs as needed
3. Checkpoint at each transition: confirm direction with user
4. Implement code with traceability, write tests
5. Verify all acceptance criteria satisfied

## Checkpoints

Pause at each stage transition unless user requests autonomous mode:
- "Architecture defined. Proceed to requirements?"
- "Requirements captured. Proceed to design?"
- "Design complete. Proceed to implementation?"

## Outputs

- Specs as needed (ARCHITECTURE, REQ, DESIGN, TASK)
- Implemented code with traceability markers
- Tests covering acceptance criteria

## Rules

You SHALL flow through stages in order, skipping only what exists or isn't needed.
You SHALL pause at checkpoints unless user requests autonomous mode.
You SHALL maintain traceability throughout.
You SHOULD keep each stage minimal; avoid overengineering.
You SHOULD ask clarifying questions early, not mid-implementation.
You MAY collapse stages for trivial changes.
You MAY use todos and tools as needed.
