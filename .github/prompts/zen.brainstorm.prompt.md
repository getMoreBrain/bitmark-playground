---
description: Brainstorm ideas, explore solutions, and evaluate options
argument-hint: "<topic|problem> [<constraints>]"
---

# Brainstorm Ideas

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

Brainstorm ideas and explore solutions for the specified topic.

1. DIVERGE: Generate multiple distinct approaches without filtering
2. ANALYZE: Evaluate options against constraints and trade-offs
3. CONVERGE: Recommend top candidates with rationale

## Outputs

<cli>Brainstorm summary in conversation</cli>
<file path=".zen/plans/PLAN-{nnn}-{brainstorm-topic}.md" if="user requests formalization" />

## Rules

You SHALL explore multiple distinct approaches before converging.
You SHALL identify trade-offs honestly, not just pros.
You SHALL distinguish between facts and assumptions.
You SHOULD challenge assumptions and explore alternatives.
You SHALL NOT dismiss ideas prematurely during divergence.
You SHALL engage in dialogue; ask clarifying questions.
You MAY use web search for research and validation.
You MAY use todos and tools as needed.
