---
description: Implement code and tests based on architecture, requirements, and design (tasks optional)
argument-hint: "<task|plan|design> [<instructions>]"
---

# Implement Code and Tests from Architecture, Requirements, Design, and (optional) Tasks

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
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
<file type="tasks" path=".awa/tasks/TASK-{CODE}-{feature-name}-{nnn}.md" required="if relevant" />
<file type="code" required="if relevant" />

## Action

Implement code and tests based on architecture, requirements, and design (tasks optional) as specified in the instruction above, following awa conventions.

## Traceability Markers

You MUST add these markers to create explicit traces:

```
// @awa-component: {CODE}-{ComponentName}
```
Place at the top of each file/module that implements a design component.

```
// @awa-impl: {CODE}-{n}[.{p}]_AC-{m}
```
Place above code that satisfies an acceptance criterion. Multiple markers allowed per block.

```
// @awa-test: {CODE}_P-{n}
// @awa-test: {CODE}-{n}[.{p}]_AC-{m}
```
Place above tests. Use P- for property-based tests, AC- for direct acceptance tests.

## Implementation Process

1. PARSE DESIGN
  - Identify components and their interfaces
  - Note IMPLEMENTS references (which ACs each component covers)
  - Note properties ({CODE}_P-{n}) and what they VALIDATE

2. PARSE REQ
  - Understand acceptance criteria being implemented
  - Note criterion types (event, ubiquitous, conditional, etc.)

3. IF TASKS PROVIDED
  - Follow task order strictly
  - Implement one task at a time
  - Update TASK file checkmark, and report completion of each task before proceeding to the next

4. IF NO TASKS
  - Implement components in dependency order
  - Start with bootstrapping, then types/interfaces, then core logic, then entry points

5. FOR EACH COMPONENT
  - Add @awa-component marker at file/module top
  - Implement interface as specified in DESIGN
  - Add @awa-impl marker above code satisfying each AC
  - One AC may require multiple @awa-impl markers across files
  - Update REQ file AC checkmark when fully implemented

6. FOR EACH TEST
  - Property tests (@awa-test: {CODE}_P-{n}): Use property-based testing framework
  - Acceptance tests (@awa-test: {CODE}-{n}[.{p}]_AC-{m}): Use example-based assertions
  - A single test may verify multiple ACs or properties
  - Update DESIGN file Correctness Property checkmark when fully implemented

## Outputs

- source code files with appropriate markers
- test files with appropriate markers
- associated project configuration files if needed

## Constraints

- Never implement without a corresponding DESIGN component
- Never add @awa-impl without understanding the AC's criterion type
- Prefer one @awa-component per file; split if file covers multiple components
- Keep @awa-impl markers close to the implementing code, not at file top
- If AC cannot be fully satisfied, add marker with comment: `// @awa-impl: {CODE}-{n}[.{p}]_AC-{m} (partial: reason)`
- If PLAN task is blocked, report blocker and await instruction

## Example

Given:
- CFG-1: Config Loading with CFG-1_AC-1 (load from path), CFG-1_AC-2 (merge with defaults)
- DESIGN component CFG-ConfigLoader with IMPLEMENTS: CFG-1_AC-1, CFG-1_AC-2
- DESIGN property CFG_P-1 [Default Preservation] VALIDATES: CFG-1_AC-2

Output:

```typescript
// FILE: src/config/loader.ts

// @awa-component: CFG-ConfigLoader

import { Config, RawConfig } from './types';
import { defaults } from './defaults';

// @awa-impl: CFG-1_AC-1
export async function load(path: string): Promise {
  const content = await fs.readFile(path, 'utf8');
  return parse(content);
}

// @awa-impl: CFG-1_AC-2
export function merge(raw: RawConfig): Config {
  return { ...defaults, ...raw };
}
```

```typescript
// FILE: tests/config/loader.test.ts

import * as fc from 'fast-check';

// @awa-test: CFG_P-1
test.prop([fc.object()])('preserves defaults for missing keys', (partial) => {
  const result = merge(partial);
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in partial)) {
      expect(result[key]).toBe(value);
    }
  }
});

// @awa-test: CFG-1_AC-1
test('loads config from valid path', async () => {
  const config = await load('fixtures/valid.toml');
  expect(config).toBeDefined();
});
```

## Rules

You SHALL write code at the level of a technical lead.
You SHALL consider edge cases and error handling.
You SHALL use KISS, and YAGNI principles. Do not create more than requested.
You SHALL write tests to cover the requirements and success criteria. If no tests exist for the written code, you MUST create them.
You SHALL actively research existing code to apply the DRY principle.
You SHALL consider edge cases, UX, technical constraints, success criteria.
You MUST NOT add features or functionality beyond what is specified or requested.
You SHALL use any tools you need to help write and test code (e.g. MCP tools for result visualization).
You MUST add traceability markers (`@awa-component`, `@awa-impl`, `@awa-test`) to all code and tests.
You MUST ensure every feature implementation traces to at least one acceptance criterion.
You MUST ensure every test file traces to at least one design property.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
