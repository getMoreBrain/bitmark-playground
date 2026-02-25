---
description: Create or update ad-hoc plan document(s)
argument-hint: "<plan-instructions>"
---

# Create or Update Plan(s)

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/PLAN.schema.md" required="true" error="on not found" />
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
<file type="code_and_tests" path="various" required="if relevant" />

## Action

Update or create the ad-hoc plan document(s) as specified in the instruction above, following awa conventions.

## Outputs

<file path=".awa/plans/PLAN-{nnn}-{plan-name}.md" />

## Rules

You SHALL create and maintain ad-hoc plans for features, improvements, refactors, or other user requests.
You SHALL break down work into detailed, actionable steps
You SHALL identify risks, dependencies, and completion criteria
You SHALL ensure the 3-letter {nnn} used in the filename follows the previous plans within the project.
You SHOULD NOT write significant code in the plan documents. Code can be used to define data structures and for explanation.
You SHOULD consider edge cases, user experience, technical constraints, and success criteria.
You SHOULD suggest specific areas where the plan might need clarification or expansion.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
