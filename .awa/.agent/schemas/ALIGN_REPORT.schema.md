<schema target-files=".awa/alignment/ALIGN-{x}-WITH-{y}-{nnn}.md">

<definitions>
  x = source artifact (what is being validated).
  y = target artifact (what x is validated against).
  <severity>
    CRITICAL: MUST/SHALL violation, security, data integrity
    MAJOR: SHOULD violation, UX, performance
    MINOR: MAY not implemented, orphan traces, optional
    INFO: superset additions, suggestions
  </severity>
  <confidence>
    CERTAIN: explicit trace (IMPLEMENTS, VALIDATES, @awa-*)
    LIKELY: naming convention or strong inference
    UNCERTAIN: semantic inference only → flag for human review
  </confidence>
  <finding-type>
    MISSING | DIFFERENCE | CONFLICT | INCOMPLETE | UNTESTED | ORPHAN | SUPERSET
  </finding-type>
  <trace_matrix>
    <trace in="DESIGN component" marker="IMPLEMENTS: {CODE}-{n}[.{p}]_AC-{m}" to="REQ AC" />
    <trace in="DESIGN property" marker="{CODE}_P-{n} VALIDATES: {CODE}-{n}[.{p}]_AC-{m} | {CODE}-{n}" to="REQ" />
    <trace in="code" marker="@awa-component: {CODE}-{ComponentName}" to="DESIGN component" />
    <trace in="code" marker="@awa-impl: {CODE}-{n}[.{p}]_AC-{m}" to="REQ AC" />
    <trace in="tests" marker="@awa-test: {CODE}_P-{n}" to="DESIGN property" />
    <trace in="tests" marker="@awa-test: {CODE}-{n}[.{p}]_AC-{m}" to="REQ AC" />
    <infer target="semantic_traces" when="markers missing" confidence="LIKELY|UNCERTAIN" />
  </trace_matrix>
</definitions>

```json
{
  "description": "Render as Markdown per $rendering.",
  "type": "object",
  "required": ["source", "target", "findings"],
  "properties": {
    "source": { "type": "string", "description": "x artifact path or identifier" },
    "target": { "type": "string", "description": "y artifact path or identifier" },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["severity", "confidence", "type", "sourceRef", "problem"],
        "properties": {
          "severity": { "enum": ["critical", "major", "minor", "info"] },
          "confidence": { "enum": ["certain", "likely", "uncertain"] },
          "type": { "enum": ["missing", "difference", "conflict", "incomplete", "superset", "orphan", "untested"] },
          "sourceRef": {
            "type": "object",
            "required": ["location"],
            "properties": {
              "location": { "type": "string" },
              "text": { "type": "string" }
            }
          },
          "targetRef": {
            "type": "object",
            "properties": {
              "location": { "type": "string" },
              "text": { "type": "string" }
            }
          },
          "problem": { "type": "string" },
          "traceability": { "enum": ["explicit-implements", "explicit-validates", "explicit-awa-component", "explicit-awa-impl", "explicit-awa-test", "naming", "semantic"], "description": "How the trace was established" },
          "resolution": { "type": "string" }
        }
      }
    }
  },
  "$rendering": {
    "templates": {
      "withFindings": [
        "# ALIGNMENT REPORT",
        "{source} ↔ {target}",
        "",
        "{for each finding: templates.finding}",
        "",
        "## Summary",
        "CRITICAL: {count}",
        "MAJOR: {count}",
        "MINOR: {count}",
        "INFO: {count}",
        "STATUS: {PASSED ✅ | FAILED ❌}"
      ],
      "noFindings": [
        "# ALIGNMENT REPORT",
        "{source} ↔ {target}",
        "All checks passed. No alignment issues found.",
        "**STATUS: PASSED ✅**"
      ],
      "finding": [
        "- [ ] {n}. {SEVERITY} [{CONFIDENCE}] {TYPE}",
        "",
        "  SOURCE: {sourceRef.location}",
        "  > {sourceRef.text}",
        "",
        "  TARGET: {targetRef.location}",
        "  > {targetRef.text}",
        "",
        "  ISSUE: {problem}",
        "",
        "  RESOLUTION: {resolution}",
        "",
        "  *Traced via: {traceability}*"
      ]
    },
    "statusRules": [
      "FAILED if any CRITICAL or MAJOR findings",
      "PASSED otherwise"
    ],
    "templateSelection": [
      "No findings → noFindings",
      "Findings exist → withFindings"
    ],
    "omissionRules": [
      "Omit source blockquote if sourceRef.text absent",
      "Omit TARGET: line entirely if targetRef absent → show 'TARGET: (not found)'",
      "Omit target blockquote if targetRef.text absent",
      "Omit *Traced via* if traceability starts with 'explicit-'",
      "Omit RESOLUTION: if resolution absent"
    ]
  }
}
```

<example>
# ALIGNMENT REPORT

DESIGN-WKS-workspace.md ↔ src/workspace/**

- [ ] 1. CRITICAL [CERTAIN] MISSING
  SOURCE: WKS-WorkspaceConfig (IMPLEMENTS: WKS-1_AC-1)
  > pub fn load(root: &Path) -> Result<Self, WorkspaceError>
  TARGET: (not found)
  ISSUE: Design component declares IMPLEMENTS: WKS-1_AC-1, but no code file contains @awa-component: WKS-WorkspaceConfig with @awa-impl: WKS-1_AC-1.
  RESOLUTION: Add @awa-component: WKS-WorkspaceConfig and @awa-impl: WKS-1_AC-1 to src/workspace/config.rs

- [ ] 2. MAJOR [CERTAIN] DIFFERENCE
  SOURCE: WKS-WorkspaceValidator (IMPLEMENTS: WKS-2_AC-3)
  > fn validate(&self) -> Result<(), ValidationError>
  TARGET: src/workspace/validator.rs:45
  > fn validate(&self) -> bool
  ISSUE: Return type mismatch. Design specifies Result<(), ValidationError> but implementation returns bool, losing error context.
  RESOLUTION: Update validator.rs to return Result<(), ValidationError> as specified in design

## Summary

CRITICAL: 1
MAJOR: 1
MINOR: 0
INFO: 0

STATUS: FAILED ❌
</example>

</schema>
