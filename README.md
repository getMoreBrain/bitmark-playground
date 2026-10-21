# bitmark Playground

[![Deploy](https://github.com/getMoreBrain/bitmark-playground/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/getMoreBrain/bitmark-playground/actions/workflows/deploy-pages.yml)
[![Release](https://img.shields.io/github/v/release/getMoreBrain/bitmark-playground)](https://github.com/getMoreBrain/bitmark-playground/releases)
[![License](https://img.shields.io/github/license/getMoreBrain/bitmark-playground)](./LICENSE)

A web playground for parsing and generating [bitmark](https://docs.bitmark.cloud/).

**[Open the bitmark Playground](https://getmorebrain.github.io/bitmark-playground/)**

## Features

- **Convert bitmark to JSON and back.** Edit either side; the other updates as you type.
- **Optimised or full output** from the bitmark parser (Settings → _Optimised_ / _Full_).
- **Preview:** the HTML output rendered as a learner would see it (the bottom-right panel).
- **More outputs:** HTML, XML (niso-iec) and plain text. Optional bottom panels with per-bit info,
  mappings and the lexer's tokens (Settings → _Show bottom panels_).
- **The legacy parser,** the deprecated JavaScript bitmark-parser-generator, in its own Legacy
  Bitmark and Legacy JSON tabs (Settings → _Legacy parser (bpg)_, off by default). It is only
  loaded while it is on.
- **Editing help from the parser:** diagnostics, hover and completion. Choosing a bit type after
  `[.` inserts the bit's template (its usual tags, body and card structure).
- **Linked scrolling:** the bitmark and output panes scroll together, bit by bit (Settings →
  _Link scrolling_).
- **Works on narrow screens:** below 900px wide the panels stack vertically and the page scrolls;
  tab bars scroll sideways.
- **Search everything** with Ctrl+F (Cmd+F on macOS): every pane on screen, with a match count per
  pane. Enter / Shift+Enter step through the matches, and the linked panes follow to the same bit.
  Each pane also has its own find and replace (Ctrl+H, F3).

### URL options

| Option                                                     | Effect                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `?tab=json`, `?tab=html`, `?tab=xml-niso-iec`, `?tab=text` | Open with that right-hand tab selected.                     |
| `?v=<version>`                                             | Load that version of the legacy parser (default: `latest`). |

## The editors as a package

The playground's bitmark and JSON editors are also available as a framework-agnostic package,
[`@gmb/bitmark-editor`](https://www.npmjs.com/package/@gmb/bitmark-editor) (custom elements, a
React adapter and a CDN-ready build), developed in
[getMoreBrain/bitmark-editor](https://github.com/getMoreBrain/bitmark-editor). The playground uses
the published package.

## Development

Needs [Bun](https://bun.sh/) 1.3 and Node.js 24.

```sh
bun install
bun start          # development server on http://localhost:3010/bitmark-playground/
bun run build      # production build in build/
bun run preview    # serve the production build
bun run lint
```


## Issues

Found a bug or have an idea? Please
[open an issue](https://github.com/getMoreBrain/bitmark-playground/issues).

## License

[ISC](LICENSE)
