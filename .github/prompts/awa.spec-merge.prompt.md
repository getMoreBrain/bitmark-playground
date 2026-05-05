---
description: Merge two feature codes into one using awa spec merge
argument-hint: "<source-code> <target-code>"
---

# Merge Two Feature Codes

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
<file type="feat" path=".awa/specs/FEAT-{SOURCE_CODE}-*.md" required="true" />
<file type="feat" path=".awa/specs/FEAT-{TARGET_CODE}-*.md" required="if exists" />
<file type="requirements" path=".awa/specs/REQ-{SOURCE_CODE}-*.md" required="if exists" />
<file type="requirements" path=".awa/specs/REQ-{TARGET_CODE}-*.md" required="if exists" />
<file type="design" path=".awa/specs/DESIGN-{SOURCE_CODE}-*.md" required="if exists" />
<file type="design" path=".awa/specs/DESIGN-{TARGET_CODE}-*.md" required="if exists" />
<file type="api" path=".awa/specs/API-{SOURCE_CODE}-*.tsp" required="if exists" />
<file type="api" path=".awa/specs/API-{TARGET_CODE}-*.tsp" required="if exists" />
<file type="examples" path=".awa/specs/EXAMPLE-{SOURCE_CODE}-*.md" required="if exists" />
<file type="examples" path=".awa/specs/EXAMPLE-{TARGET_CODE}-*.md" required="if exists" />
<file type="tasks" path=".awa/tasks/TASK-{SOURCE_CODE}-*.md" required="if exists" />
<file type="tasks" path=".awa/tasks/TASK-{TARGET_CODE}-*.md" required="if exists" />

## Action

Merge the source feature code into the target feature code using `awa spec merge`, following awa conventions.

This combines all spec files, traceability IDs, code markers, and tests from the source code into the target code's namespace, then removes the source.

## Merge Process

0. PRE-VALIDATE
   - Run `awa check` to record existing errors before proceeding

1. IDENTIFY CODES
   - Determine the source code (to be absorbed) and target code (to receive content)
   - Verify both codes exist by checking for spec files: `awa spec codes`
   - Confirm the merge direction with the user if ambiguous

2. PREVIEW CHANGES
   - Run `awa spec merge <source> <target> --dry-run` to see planned operations
   - Review the output: ID remap table, file moves, renames
   - If output looks wrong, abort and investigate

3. EXECUTE MERGE
   - Run `awa spec merge <source> <target>` to apply the merge

4. CONSOLIDATE TARGET FILES
   - List all spec files now under the target code namespace
   - For each file type (FEAT, REQ, DESIGN, API, EXAMPLE), check if multiple files exist that should be combined
   - Where two files of the same type cover closely related or overlapping content, merge them into one:
     - Append the smaller file's content to the larger one
     - Remove duplicate sections, but do not alter the wording of requirements or design components
     - Ensure the merged file stays within schema line limits; split if needed
   - Files that cover distinct topics should remain separate

5. FIX MERGED FILES
   - Open every merged spec file and verify content coherence
   - Reorder content into logical order
   - Check that REQ files have consistent requirement structure
   - Check that DESIGN files have non-overlapping component names
   - Ensure all files respect schema line limits; split if needed

6. VALIDATE
   - Run `awa check` to verify new status
   - Fix any newly reported errors
   - If no errors reported, process is complete

## Outputs

- Renamed spec files under the target code namespace, with recoded traceability markers
- Optionally consolidated target files where content overlaps

## Rules

You SHALL always preview with `--dry-run` before executing a merge.
You SHALL confirm the merge direction (source → target) with the user.
You SHALL run `awa check --spec-only` after merge to verify structural integrity.
You SHALL run `awa check` after merge if code markers were rewritten.
You SHALL review merged file content for coherence and size limits.
You SHALL use `--renumber` when clean sequential IDs are requested.
You SHALL NOT merge a code into itself.
You SHALL NOT proceed if `--dry-run` reveals unexpected stale references.
You SHALL update user-facing documentation when the merge changes public features, CLI, or configuration.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
