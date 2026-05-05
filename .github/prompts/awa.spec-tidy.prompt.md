---
description: Tidy and reorganise the specifications logically
---

# Tidy and Reorganise Specifications

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
<file type="requirements" path=".awa/specs/REQ-{SOURCE_CODE}-*.md" required="if exists" />
<file type="design" path=".awa/specs/DESIGN-{SOURCE_CODE}-*.md" required="if exists" />
<file type="api" path=".awa/specs/API-{SOURCE_CODE}-*.tsp" required="if exists" />
<file type="examples" path=".awa/specs/EXAMPLE-{SOURCE_CODE}-*.md" required="if exists" />
<file type="tasks" path=".awa/tasks/TASK-{SOURCE_CODE}-*.md" required="if exists" />

## Action

Tidy and reorganise the specifications logically, following awa conventions. Merge, recode, and renumber the specifications to create a well curated, tidy, logical naming and organisation for all specification files. Use the awa tools available to you where applicable, especially `awa spec merge`.

## Merge Process

0. PRE-VALIDATE
   - Run `awa check` to record existing errors before proceeding

1. IDENTIFY CHANGES
   - Find existing codes for spec files: `awa spec codes`
   - Read through all spec files to understand their content and relationships
   - Identify files that should be merged, recoded, or renumbered to improve logical organisation
   - For merges, determine the source and target codes

2. PREVIEW CHANGES
   - For each planned merge, run `awa spec merge <source> <target> --dry-run` to see planned operations
   - Review the output: ID remap table, file moves, renames
   - For each planned recode, run `awa spec recode <code> <new-code> --dry-run` to see planned operations
   - Review the output: ID remap table, file renames
   - For each planned renumber, run `awa spec renumber <code> --dry-run` to see planned ID changes
   - Review the output: ID remap table
   - If output looks wrong, abort and investigate

3. EXECUTE MERGE / RECODE / RENUMBER
   - Run the commands without dry run to apply the changes

4. CONSOLIDATE FILES
   - Re-list all spec files
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

- Well named and structured spec files with consistent codes and logical organisation

## Rules

You SHALL always preview with `--dry-run` before executing an awa operation.
You SHALL run `awa check --spec-only` after reorganisation to verify structural integrity.
You SHALL run `awa check` after reorganisation if code markers were rewritten.
You SHALL review reorganised file content for coherence and size limits.
You SHALL use `--renumber` when clean sequential IDs are requested.
You SHALL NOT merge a code into itself.
You SHALL NOT proceed if `--dry-run` reveals unexpected stale references.
You SHALL update user-facing documentation when the reorganisation changes public features, CLI, or configuration.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
