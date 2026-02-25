<schema target-files=".awa/specs/FEAT-{CODE}-{feature-name}.md">

- Non-normative feature context. Explain what and why, not how.
- Use clear, accessible language. Avoid jargon unless defined in glossary.
- Required sections: problem, conceptual model, scenarios.
- Optional sections: background, glossary, stakeholders, diagrams, non-normative notes.
- Prohibited: normative language (SHALL/SHOULD/MAY), acceptance criteria, traceability IDs, design decisions.
- Mark the document as INFORMATIVE (not normative).
- Add metadata with change log.

Example structure:

```
# Feature Context [INFORMATIVE]

## Problem

Why this feature exists. What pain point or gap it addresses.

## Conceptual Model

How users should think about this feature. Mental model, key abstractions.

## Scenarios

Concrete usage examples illustrating the feature in action.

### Scenario 1: {title}
{narrative}

### Scenario 2: {title}
{narrative}

## Background

Additional context: history, prior art, references.

## Glossary

- TERM: Definition

## Stakeholders

- ROLE: How they relate to this feature

## Diagrams

```mermaid
{diagram}
```

## Non-Normative Notes

Recommendations, best practices, or explanatory content that is not testable.

## Change Log

- {version} ({date}): {changes}
```

</schema>
