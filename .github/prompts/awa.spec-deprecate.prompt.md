---
description: Deprecate requirements by retiring IDs to the tombstone file
argument-hint: "<IDs or description of what to deprecate>"
---

# Deprecate Requirements

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/DEPRECATED.schema.yaml" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="true" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="deprecated" path=".awa/specs/deprecated/DEPRECATED.md" required="if exists" />

## Action

Deprecate (retire) the specified requirements, acceptance criteria, properties, or components by adding their IDs to the tombstone file and cleaning up references.

## Process

1. IDENTIFY IDS TO DEPRECATE
   - From the user input, determine which IDs to retire (requirement IDs, AC IDs, property IDs, component names)
   - Verify each ID exists in the current specs using `awa trace <ID>`
   - List the IDs grouped by feature code for confirmation

2. UPDATE TOMBSTONE FILE
   - Open or create `.awa/specs/deprecated/DEPRECATED.md`
   - For each feature code affected, find or create the `# {CODE}` heading
   - Add the deprecated IDs under the appropriate heading, comma-separated per line
   - Group logically: requirement IDs, then AC IDs, then property IDs, then component names
   - Ensure the file conforms to `DEPRECATED.schema.yaml` — only bare IDs, no prose

3. REMOVE DEPRECATED CODE (ONLY IF REQUESTED)
   - If the user specifically requests it, remove deprecated code, test and markers

4. REMOVE FROM ACTIVE SPECS
   - Remove deprecated requirements and their ACs from REQ files
   - Remove deprecated components and properties from DESIGN files
   - Remove IMPLEMENTS/VALIDATES references to deprecated IDs from remaining design components
   - If an entire spec file becomes empty after removal, delete it

5. CLEAN UP TASKS / PLANs
   - In any TASK or PLAN files, mark tasks referencing deprecated IDs as complete or remove them
   - Update task IMPLEMENTS/TESTS references that point to deprecated IDs

6. VALIDATE
   - Run `awa check` to verify:
     - No orphaned markers reference deprecated IDs
     - No active spec reuses a deprecated ID (`deprecated-id-conflict`)
     - Traceability chain is intact for remaining requirements
   - Run `awa check --deprecated` to surface any stale references as warnings
   - Fix any errors found

7. REPORT
   - Summarize which IDs were deprecated
   - Note any code that lost markers but was left in place
   - Note any remaining `deprecated-ref` warnings from `--deprecated` output

## Outputs

<file path=".awa/specs/deprecated/DEPRECATED.md" />
- Updated REQ, DESIGN, and TASK spec files (deprecated content removed)
- Updated source and test files (stale markers removed)

## Rules

You SHALL verify each ID exists before deprecating it.
You SHALL add every deprecated ID to the tombstone file — no ID may be lost silently.
You SHALL NOT reuse a deprecated ID for new requirements.
You SHALL NOT delete code that implements deprecated requirements — only remove traceability markers.
You SHALL run `awa check` after deprecation to verify the traceability chain is clean.
You SHALL confirm the list of IDs with the user before making changes if the scope is large (more than 5 IDs).
You SHOULD deprecate an entire requirement and all its ACs together, not individual ACs in isolation, unless the user explicitly requests partial deprecation.
You MAY use todos and tools as needed.
