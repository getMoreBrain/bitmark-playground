---
description: Create or update task list document
argument-hint: "<design> [<instructions>]"
---

# Create or Update Task List(s)

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/DESIGN.schema.md" optional="true" />
 <read path=".awa/.agent/schemas/REQ.schema.md" optional="true" />
 <read path=".awa/.agent/schemas/TASK.schema.md" required="true" error="on not found" />
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

## Action

Update or create the task list document(s) as specified in the instruction above, following awa conventions.

## Process

1. PARSE REQ
   - Extract requirements ({CODE}-{n}) with priorities (must/should/could)
   - Extract acceptance criteria ({CODE}-{n}[.{p}]_AC-{m}) with types
   - Note dependencies between requirements
   - Identify testable criteria

2. PARSE DESIGN
   - Extract components ({CODE}-{ComponentName}) and interfaces
   - Map IMPLEMENTS references (component → ACs)
   - Extract properties ({CODE}_P-{n}) and VALIDATES references
   - Note architectural decisions and constraints
   - Extract error types for error handling tasks

3. IF ARCH PROVIDED
   - Extract project structure for file paths
   - Extract technology stack for setup tasks
   - Note architectural rules as constraints

4. GENERATE TASKS
   - Phase 1: Setup (project initialization, dependencies)
   - Phase 2: Foundation (shared types, core interfaces, error types)
   - Phase 3+: One phase per requirement (priority order: must → should → could)
   - Final Phase: Integration and polish
   - Include test tasks based on properties and ACs

5. VALIDATE
   - Every AC has at least one implementing task
   - Every P has a test task
   - No orphan tasks (all trace to AC or P)
   - Dependencies respect component order from DESIGN

## Task Organization

### From Requirements

- Each requirement ({CODE}-{n}) becomes a phase (priority order)
- All ACs for that requirement → tasks within its phase
- Subrequirements ({CODE}-{n}.{p}) nest under parent phase

### From Design Components

- Each component → one or more implementation tasks
- Component's IMPLEMENTS list → task's IMPLEMENTS line
- Component interface → task description specifics

### From Properties

- Each property ({CODE}_P-{n}) → test task
- Property's VALIDATES list → determines test assertions
- Property type determines test approach:
  - Invariants → property-based tests
  - Specific behaviors → example-based tests

### From Error Types

- Each error type → error handling task in Foundation phase
- Error variants → validation tasks in relevant requirement phases

## Phase Structure

### Phase 1: Setup

- Project initialization
- Dependency installation
- Configuration scaffolding
- No requirement labels, no IMPLEMENTS lines

### Phase 2: Foundation

- Core types from DESIGN dataModels
- Error types from DESIGN errorHandling
- Shared interfaces
- No requirement labels, IMPLEMENTS only if AC covers foundation

### Phase 3+: Requirements (priority order)

Within each requirement phase:
1. Types/models specific to this requirement
2. Implementation tasks (component by component)
3. Test tasks (properties first, then direct AC tests)

Each phase should be independently testable after completion.

### Final Phase: Polish

- Integration tests across requirements
- Documentation updates
- Cross-cutting concerns
- No requirement labels

## Validation Checklist

Before output, verify:

- [ ] Every task has correct format (checkbox, ID, description, path)
- [ ] Every AC appears in at least one IMPLEMENTS line
- [ ] Every P appears in at least one TESTS line
- [ ] Requirement labels only on requirement phase tasks
- [ ] [P] markers only where truly parallelizable
- [ ] Dependencies match DESIGN component order
- [ ] Each requirement phase has clear test criteria
- [ ] Trace summary accounts for all ACs and Ps

## Outputs

<file path=".awa/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" />

## Rules

You SHALL clarify open points with user.
You MAY use todos and tools as needed.
