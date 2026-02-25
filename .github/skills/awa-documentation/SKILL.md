---
name: awa-documentation
description: Create or update project documentation (README.md and /docs). Use this when asked to write, update or improve documentation.
---

# Create or Update Documentation

## Bootstrap

<tool name="read_file">
 <read path=".awa/.agent/awa.core.md" required="true" error="on not found" />
 <read path=".awa/rules/*.md" required="true" />
 <read path=".awa/specs/ARCHITECTURE.md" required="true" error="on not found" />
 <read path=".awa/.agent/schemas/README.schema.md" required="true" error="on not found" />
</tool>

## User Input

```text
${input}
```

You **MUST** consider the user input before proceeding (if not empty).

## Inputs

<file type="architecture" path=".awa/specs/ARCHITECTURE.md" />
<file type="requirements" path=".awa/specs/REQ-{CODE}-{feature-name}.md" required="if relevant" />
<file type="design" path=".awa/specs/DESIGN-{CODE}-{feature-name}.md" required="if relevant" />
<file type="readme" path="README.md" required="if exists" />
<file type="docs" path="docs/*.md" required="if exists and relevant" />

## Action

Update or create documentation as specified in the instruction above, following awa conventions.

## Documentation Structure Example

```
README.md              # Project entry point (user-facing)
docs/
├── {topic}.md         # Documentation on a specific topic
├── getting-started.md # Quick start guide
├── configuration.md   # Configuration reference
├── cli-reference.md   # CLI command reference (if CLI project)
├── api.md             # API reference (if library)
├── templates.md       # Template authoring (if template-based)
├── architecture.md    # Public architecture overview (optional)
└── contributing.md    # Contribution guidelines (or CONTRIBUTING.md at root)
```

## Documentation Principles

1. README.md is the entry point
   - User-facing, not developer-facing
   - Brief and scannable
   - Links to /docs for details
   - Shows quick start, not comprehensive guide

2. /docs contains detailed documentation
   - Each file covers one topic
   - Reference style for commands/APIs
   - Tutorial style for guides
   - Keep files under 500 lines; split if larger

3. Derive from specifications
   - Do not duplicate; summarize and link

4. Keep synchronized
   - Update docs when specs change
   - Remove docs for deprecated features

## Output Files

<file path="README.md" />
<file path="docs/{topic}.md" />

## Rules

You SHALL write documentation for end users, not internal developers.
You SHALL keep README.md concise and link to /docs for details.
You SHALL derive documentation content from architecture and design specs.
You SHALL NOT duplicate specification content; summarize and reference.
You SHALL ensure code examples are accurate and runnable.
You SHALL use consistent terminology matching the glossary in specs.
You SHALL organize /docs by topic, not by component.
You SHALL include practical examples for each feature documented.
You SHOULD update documentation when related specifications change.
You SHOULD include troubleshooting sections for common issues.
You SHALL clarify open points with user.
You MAY use todos and tools as needed.
