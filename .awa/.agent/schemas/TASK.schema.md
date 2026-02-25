<schema target-files=".awa/tasks/TASK-{CODE}-{feature-name}-{nnn}.md">

```json
{
  "description": "Implementation tasks only. Dependency-ordered. Traceable to REQ and DESIGN.",
  "required": ["feature", "source", "phases", "dependencies", "traceSummary"],
  "properties": {
    "feature": { "type": "feature name from REQ" },
    "source": { "type": "array of source file paths (REQ, DESIGN)" },
    "phases": { "type": "array", "items": { "$ref": "#/$defs/phase" } },
    "dependencies": { "type": "array", "items": { "$ref": "#/$defs/dependency" } },
    "parallelOpportunities": { "type": "array", "items": { "properties": { "phase": {}, "tasks": { "type": "array of task IDs" }, "notes": {} } } },
    "traceSummary": {
      "required": ["acCoverage", "propertyCoverage"],
      "properties": {
        "acCoverage": { "type": "array", "items": { "properties": { "ac": {}, "task": {}, "test": {} } } },
        "propertyCoverage": { "type": "array", "items": { "properties": { "property": {}, "test": {} } } },
        "uncovered": { "type": "array of AC or P IDs" }
      }
    }
  },
  "$defs": {
    "phase": {
      "required": ["name", "tasks"],
      "properties": {
        "name": { "type": "phase name" },
        "type": { "enum": ["setup", "foundation", "requirement", "polish"] },
        "requirement": { "type": "{CODE}-{n} (only for requirement phases)" },
        "priority": { "enum": ["must", "should", "could"] },
        "goal": { "type": "requirement's story.want (only for requirement phases)" },
        "testCriteria": { "type": "how to verify phase is complete" },
        "tasks": { "type": "array", "items": { "$ref": "#/$defs/task" } }
      }
    },
    "task": {
      "required": ["id", "description", "path"],
      "properties": {
        "id": { "type": "pattern: T-{CODE}-{nnn} (e.g., T-CFG-001)" },
        "parallel": { "type": "boolean, true if parallelizable" },
        "requirement": { "type": "{CODE}-{n} (only in requirement phases)" },
        "description": { "type": "clear action" },
        "path": { "type": "target file path" },
        "implements": { "type": "array of {CODE}-{n}[.{p}]_AC-{m}" },
        "tests": { "type": "array of {CODE}_P-{n} or {CODE}-{n}[.{p}]_AC-{m}" }
      }
    },
    "dependency": {
      "required": ["requirement", "dependsOn"],
      "properties": {
        "requirement": { "type": "{CODE}-{n}" },
        "dependsOn": { "type": "array of {CODE}-{n} or empty" },
        "reason": { "type": "why dependency exists" }
      }
    }
  },
  "$render": {
    "template": "# Implementation Tasks\n\nFEATURE: {feature}\nSOURCE: {source}\n\n{phases→'## {name} {[priority]?}\n\n{goal→\"GOAL: {}\"}\n{testCriteria→\"TEST CRITERIA: {}\"}\n\n{tasks→\"- [ ] {id} {[P]?} {[requirement]?} {description} → {path}\n      {implements→\\\"IMPLEMENTS: {}\\\"}\n      {tests→\\\"TESTS: {}\\\"}\"}'}\n\n---\n\n## Dependencies\n{dependencies→'{requirement} → {dependsOn|\"(none)\"} {reason?}'}\n\n## Parallel Opportunities\n{parallelOpportunities→'{phase}: {tasks} {notes?}'}\n\n## Trace Summary\n\n| AC | Task | Test |\n|----|------|------|\n{traceSummary.acCoverage→'| {ac} | {task} | {test} |'}\n\n| Property | Test |\n|----------|------|\n{traceSummary.propertyCoverage→'| {property} | {test} |'}\n\nUNCOVERED: {traceSummary.uncovered|\"(none)\"}",
    "omit": ["[P] if parallel false/absent", "[requirement] if absent", "[priority] if absent", "GOAL if absent", "TEST CRITERIA if absent", "IMPLEMENTS line if empty", "TESTS line if empty", "reason if absent", "notes if absent"],
    "prohibited": ["**bold** — use CAPITALS", "tasks without file paths", "IMPLEMENTS/TESTS on setup tasks", "[requirement] labels on setup/foundation/polish phases", "orphan tasks (must trace to AC or P)"],
    "checkbox": "[ ] always unchecked in generated output"
  }
}
```

<example>
# Implementation Tasks

FEATURE: Configuration System
SOURCE: REQ-CFG-config.md, DESIGN-CFG-config.md

## Phase 1: Setup

- [ ] T-CFG-001 Initialize module structure → src/config/
- [ ] T-CFG-002 [P] Add dependencies (smol-toml) → package.json

## Phase 2: Foundation

- [ ] T-CFG-003 Define Config and RawConfig types → src/config/types.ts
- [ ] T-CFG-004 Define ConfigError variants → src/config/errors.ts

## Phase 3: Config Loading [MUST]

GOAL: Load and merge configuration from file with defaults
TEST CRITERIA: Can load valid TOML, missing keys get defaults

- [ ] T-CFG-010 [CFG-1] Implement load function → src/config/loader.ts
  IMPLEMENTS: CFG-1_AC-1
- [ ] T-CFG-011 [CFG-1] Implement merge function → src/config/loader.ts
  IMPLEMENTS: CFG-1_AC-2
- [ ] T-CFG-012 [P] [CFG-1] Property test for default preservation → tests/config/loader.test.ts
  TESTS: CFG_P-1
- [ ] T-CFG-013 [P] [CFG-1] Test load from valid path → tests/config/loader.test.ts
  TESTS: CFG-1_AC-1

## Phase 4: Config Validation [SHOULD]

GOAL: Validate loaded config against schema
TEST CRITERIA: Invalid config rejected with clear error

- [ ] T-CFG-020 [CFG-2] Implement validate function → src/config/validator.ts
  IMPLEMENTS: CFG-2_AC-1
- [ ] T-CFG-021 [P] [CFG-2] Test schema validation → tests/config/validator.test.ts
  TESTS: CFG-2_AC-1

## Phase 5: Polish

- [ ] T-CFG-030 Integration test: load → validate → use → tests/config/integration.test.ts
  TESTS: CFG-1_AC-1, CFG-2_AC-1

---

## Dependencies

CFG-1 → (none)
CFG-2 → CFG-1 (validates loaded config)

## Parallel Opportunities

Phase 3: T-CFG-012, T-CFG-013 can run parallel after T-CFG-011
Phase 4: T-CFG-021 can run parallel with T-CFG-020

## Trace Summary

| AC | Task | Test |
|----|------|------|
| CFG-1_AC-1 | T-CFG-010 | T-CFG-013 |
| CFG-1_AC-2 | T-CFG-011 | T-CFG-012 |
| CFG-2_AC-1 | T-CFG-020 | T-CFG-021 |

| Property | Test |
|----------|------|
| CFG_P-1 | T-CFG-012 |

UNCOVERED: (none)
</example>

</schema>