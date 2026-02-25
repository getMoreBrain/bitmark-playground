<schema target-files=".awa/specs/EXAMPLES-{CODE}-{feature-name}-{nnn}.md">

- Concrete usage examples for a feature. Detailed, hands-on, reproducible.
- Use the same {CODE} as the corresponding FEAT/REQ for the feature.
- Number files sequentially (-001, -002, ...) when splitting at the 500-line limit.
- Each example must have a title and context explaining what it demonstrates.
- Required: at least one example with title, context, and code/demonstration block.
- Optional: prerequisites, expected output, notes.
- Prohibited: normative language (SHALL/SHOULD/MAY), acceptance criteria, traceability IDs, design decisions.
- Mark the document as INFORMATIVE (not normative).

Example structure:

```
# Usage Examples: {Feature Name} [INFORMATIVE]

## Prerequisites

- Required tools, setup, or prior knowledge

## Example 1: {Title}

{Context — when to use this, what it demonstrates}

```bash
{CLI invocation or code}
```

EXPECTED OUTPUT:

```
{expected result}
```

## Example 2: {Title}

{Context}

```typescript
{code example}
```

NOTES:
- Additional observations or caveats

## Change Log

- {version} ({date}): {changes}
```

</schema>
