import type { Hover } from '@gmb/bitmark-parser';
import type * as MonacoApi from 'monaco-editor';

import type { BitmarkEngine } from '../engine/types';
import { log } from '../log';
import { buildBitmarkHighlightCss } from '../theme/tokens';
import {
  BitmarkSuggestion,
  COMPLETE_OPTIONS,
  COMPLETION_TRIGGER_CHARACTERS,
  CompletionQuery,
  toMonacoCompletionList,
  triggerCharacterOf,
} from './completion';
import { jsonDefaultsOf } from './jsonSchema';
import type { Monaco, TextModel } from './types';

/** Monaco language id for bitmark markup. */
export const BITMARK_LANGUAGE_ID = 'bitmark';

/**
 * Which engine answers for a model. A getter, so an attached editor can
 * change engines without re-registering (the playground's engine arrives
 * after its editors mount).
 */
const modelEngines = new WeakMap<TextModel, () => BitmarkEngine | undefined>();

/** Let the completion and hover providers answer for `model` with `engine`. */
export const bindModelEngine = (
  model: TextModel,
  engine: () => BitmarkEngine | undefined,
): (() => void) => {
  modelEngines.set(model, engine);
  return () => {
    if (modelEngines.get(model) === engine) modelEngines.delete(model);
  };
};

/** The engine bound to `model`, if any. */
export const engineForModel = (model: TextModel): BitmarkEngine | undefined =>
  modelEngines.get(model)?.();

const setUp = new WeakSet<object>();
/** The engine that produced each live suggestion, for its `resolve`. */
const resolvers = new WeakMap<object, BitmarkEngine>();

/** The parser's hover as Monaco's: LSP positions are 0-based, Monaco's 1-based. */
export const toMonacoHover = (hover: Hover): MonacoApi.languages.Hover => ({
  range: {
    startLineNumber: hover.range.start.line + 1,
    startColumn: hover.range.start.character + 1,
    endLineNumber: hover.range.end.line + 1,
    endColumn: hover.range.end.character + 1,
  },
  contents: [{ value: hover.contents.value, isTrusted: false }],
});

/** The token stylesheet, once per document. */
const injectHighlightCss = (): void => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('style[data-bitmark-highlight]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-bitmark-highlight', '');
  style.textContent = buildBitmarkHighlightCss();
  document.head.appendChild(style);
};

/**
 * The language's bracket pair, as the VS Code extension's
 * `language-configuration.json` declares it: typing `[` auto-closes to
 * `[]`, and a selection can be surrounded. Monaco only auto-closes what the
 * language declares; a bit template then replaces that `]`
 * (`replacedSuffixLength`).
 */
export const BITMARK_LANGUAGE_CONFIGURATION: MonacoApi.languages.LanguageConfiguration = {
  brackets: [['[', ']']],
  autoClosingPairs: [{ open: '[', close: ']' }],
  surroundingPairs: [{ open: '[', close: ']' }],
};

export interface SetupBitmarkMonacoOptions {
  monaco: Monaco;
}

/**
 * Register bitmark on a Monaco instance (PLAN-022 D8): the language, the
 * token stylesheet, and the completion and hover providers. Idempotent per
 * instance. The providers answer only for models bound to an engine
 * (`bindModelEngine`), so they never touch the host's own editors (D5).
 *
 * Workers and the suggest / hover contributions belong to whoever owns this
 * Monaco: the host for `/esm`, the package for `/bundled`.
 */
export const setupBitmarkMonaco = ({ monaco }: SetupBitmarkMonacoOptions): void => {
  if (setUp.has(monaco)) return;
  setUp.add(monaco);

  if (!monaco.languages.getLanguages?.().some((l) => l.id === BITMARK_LANGUAGE_ID)) {
    monaco.languages.register({ id: BITMARK_LANGUAGE_ID });
    // Only on a language we registered: a host's own bitmark language keeps
    // its configuration.
    monaco.languages.setLanguageConfiguration(BITMARK_LANGUAGE_ID, BITMARK_LANGUAGE_CONFIGURATION);
  }
  injectHighlightCss();

  // Capability check (D8): degrade with a warning, never a crash.
  if (!jsonDefaultsOf(monaco)) {
    log.warnOnce(
      'no-json-language',
      'this Monaco has no JSON language: the JSON pane runs without schema validation',
    );
  }

  monaco.languages.registerCompletionItemProvider(BITMARK_LANGUAGE_ID, {
    triggerCharacters: COMPLETION_TRIGGER_CHARACTERS,
    provideCompletionItems: async (model, position, context) => {
      const engine = engineForModel(model);
      if (!engine?.capabilities.complete) return { suggestions: [] };
      try {
        const query: CompletionQuery = {
          input: model.getValue(),
          position: { line: position.lineNumber - 1, character: position.column - 1 },
        };
        const triggerCharacter = triggerCharacterOf(monaco, context);
        const list = await engine.complete(query.input, query.position, {
          triggerCharacter,
          ...COMPLETE_OPTIONS,
        });
        if (!list) return { suggestions: [] };
        const lineBeforeCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const lineAfterCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: model.getLineMaxColumn(position.lineNumber),
        });
        const result = toMonacoCompletionList(
          monaco,
          list,
          position,
          lineBeforeCursor,
          query,
          lineAfterCursor,
        );
        // Monaco hands this object back to `resolveCompletionItem`: the
        // engine that answered travels with it.
        for (const s of result.suggestions as BitmarkSuggestion[]) {
          if (s.bitmark) resolvers.set(s, engine);
        }
        return result;
      } catch (e) {
        log.error('bitmark completion failed', e);
        return { suggestions: [] };
      }
    },
    // Fill in a suggestion's documentation from the parser (LSP
    // `completionItem/resolve`): the list ships none, so the parser renders
    // it for the one item Monaco is about to show.
    resolveCompletionItem: async (suggestion) => {
      const { bitmark } = suggestion as BitmarkSuggestion;
      if (!bitmark) return suggestion;
      const engine = resolvers.get(suggestion);
      if (!engine?.capabilities.resolve) return suggestion;
      try {
        const resolved = await engine.resolve(
          bitmark.query.input,
          bitmark.query.position,
          bitmark.item,
          COMPLETE_OPTIONS,
        );
        if (!resolved?.documentation) return suggestion;
        return {
          ...suggestion,
          documentation: { value: resolved.documentation.value, isTrusted: false },
        };
      } catch (e) {
        log.error('bitmark completion resolve failed', e);
        return suggestion;
      }
    },
  });

  monaco.languages.registerHoverProvider(BITMARK_LANGUAGE_ID, {
    provideHover: async (model, position) => {
      const engine = engineForModel(model);
      if (!engine?.capabilities.hover) return null;
      try {
        const hover = await engine.hover(model.getValue(), {
          line: position.lineNumber - 1,
          character: position.column - 1,
        });
        return hover ? toMonacoHover(hover) : null;
      } catch (e) {
        log.error('bitmark hover failed', e);
        return null;
      }
    },
  });
};
