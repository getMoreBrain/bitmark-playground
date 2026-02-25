<schema target-file="README.md">

```json
{
  "description": "Project README. Succinct language. User-facing. Link to detailed docs in /docs folder.",
  "required": ["title", "description", "installation", "usage"],
  "properties": {
    "title": { "type": "project name" },
    "badges": { "type": "array of badge markdown" },
    "description": { "type": "one paragraph: what the project does and why" },
    "features": { "type": "array of key features" },
    "installation": {
      "required": ["steps"],
      "properties": {
        "prerequisites": { "type": "array of requirements" },
        "steps": { "type": "array of commands or instructions" }
      }
    },
    "usage": {
      "required": ["quickStart"],
      "properties": {
        "quickStart": { "type": "minimal example to get started" },
        "examples": { "type": "array", "items": { "$ref": "#/$defs/example" } }
      }
    },
    "documentation": { "type": "array of links to /docs files", "items": { "$ref": "#/$defs/docLink" } },
    "contributing": { "type": "brief instructions or link to CONTRIBUTING.md" },
    "license": { "type": "license name and link" },
    "acknowledgments": { "type": "array of credits" }
  },
  "$defs": {
    "example": {
      "properties": {
        "title": {},
        "description": {},
        "code": { "type": "code block" }
      }
    },
    "docLink": {
      "required": ["title", "path"],
      "properties": {
        "title": {},
        "path": { "type": "relative path to /docs file" },
        "description": {}
      }
    }
  },
  "$render": {
    "template": "# {title}\\n\\n{badges?}\\n\\n{description}\\n\\n## Features\\n{features→'- {}'}\\n\\n## Installation\\n\\n### Prerequisites\\n{installation.prerequisites→'- {}'}\\n\\n### Install\\n{installation.steps→'```bash\\n{}\\n```'}\\n\\n## Usage\\n\\n{usage.quickStart}\\n\\n### Examples\\n{usage.examples→'#### {title}\\n{description?}\\n```\\n{CODE}\\n```'}\\n\\n## Documentation\\n{documentation→'- [{title}]({path}) — {description?}'}\\n\\n## Contributing\\n{contributing}\\n\\n## License\\n{license}\\n\\n## Acknowledgments\\n{acknowledgments→'- {}'}",
    "omit": ["section if empty", "badges if absent", "Prerequisites if empty", "description in examples if absent", "Acknowledgments if empty"],
    "prohibited": ["**bold** in section headers", "implementation details", "internal architecture", "excessive length — link to /docs instead"]
  }
}
```

<example>
# awa CLI

[![npm version](https://img.shields.io/npm/v/awa-cli.svg)](https://www.npmjs.com/package/awa-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

awa CLI generates AI coding agent configuration files from templates, enabling developers to quickly scaffold consistent agent setups across projects.

## Features

- Template-based configuration generation
- Feature flag support for conditional content
- Multiple output formats (Markdown, YAML, JSON)
- Diff mode to preview changes before applying
- Local and remote template sources

## Installation

### Prerequisites

- Node.js 20 or higher
- npm or pnpm

### Install

```bash
npm install -g awa-cli
```

## Usage

```bash
# Generate configuration from default template
awa generate

# Generate with specific features enabled
awa generate --features typescript,testing

# Preview changes without writing files
awa diff
```

### Examples

#### Custom Template

```bash
awa generate --template ./my-templates --output ./.ai
```

#### Feature Flags

```bash
awa generate --features strict,verbose --remove-features legacy
```

## Documentation

- [Configuration Guide](docs/configuration.md) — Configure templates and options
- [Template Authoring](docs/templates.md) — Create custom templates
- [CLI Reference](docs/cli-reference.md) — Complete command documentation
- [API Reference](docs/api.md) — Programmatic usage

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)

## Acknowledgments

- Eta templating engine
- Citty CLI framework
</example>

</schema>
