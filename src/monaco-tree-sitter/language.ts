import { Language as ParserLanguage, Parser } from 'web-tree-sitter';

import { Term } from './highlighter';
import { Grammar } from './types/grammer';

export class Language {
  // Parser
  parser!: Parser;

  // Grammar
  readonly simpleTerms: Record<string, Term> = {};
  readonly complexTerms: string[] = [];
  readonly complexScopes: Record<string, Term> = {};
  readonly complexDepth: number;
  readonly complexOrder: boolean;

  /**
   * Load a grammar from a grammar JSON object. Grammar JSON files are in the "grammars" directory.
   *
   * @param grammar The `JSON.parse()`-ed object of grammar JSON file.
   * @param parser The web-tree-sitter parser, should be after called `.setLanguage()`. If omitted,
   * `init()` must be called to load a compiled tree-sitter language WASM file.
   */
  constructor(grammar: Grammar, parser?: Parser) {
    for (const t in grammar.simpleTerms) this.simpleTerms[t] = grammar.simpleTerms[t];
    for (const t in grammar.complexTerms) this.complexTerms[t] = grammar.complexTerms[t];
    for (const t in grammar.complexScopes) this.complexScopes[t] = grammar.complexScopes[t];
    this.complexDepth = 0;
    this.complexOrder = false;
    for (const s in this.complexScopes) {
      const depth = s.split('>').length;
      if (depth > this.complexDepth) this.complexDepth = depth;
      if (s.indexOf('[') >= 0) this.complexOrder = true;
    }
    this.complexDepth--;

    if (parser) this.parser = parser;
  }

  /**
   * Initialize the parser with a tree-sitter language WASM file and web-tree-sitter module.
   */
  async init(languageWasmPath: string, parser: typeof Parser) {
    // Initlaize parser
    this.parser = new parser();
    const language = await ParserLanguage.load(languageWasmPath);
    this.parser.setLanguage(language);
  }
}
