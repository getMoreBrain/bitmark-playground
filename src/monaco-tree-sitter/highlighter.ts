import * as MonacoModule from 'monaco-editor';
import { Tree as ParserTree, Node as ParserNode } from 'web-tree-sitter';

import { Language } from './language';
import { Monaco } from './monaco';

export type Term =
  | 'type'
  | 'scope'
  | 'function'
  | 'variable'
  | 'number'
  | 'string'
  | 'comment'
  | 'constant'
  | 'directive'
  | 'control'
  | 'operator'
  | 'modifier'
  | 'punctuation'
  | 'punctuation-bracket'
  | 'punctuation-delimiter';

export const terms: Term[] = [
  'type',
  'scope',
  'function',
  'variable',
  'number',
  'string',
  'comment',
  'constant',
  'directive',
  'control',
  'operator',
  'modifier',
  'punctuation',
  'punctuation-bracket',
  'punctuation-delimiter',
];

// Used internally, for a middle layer between tree-sitter tree and monaco decorations/highlighter
export interface HighlightInfo {
  term: Term;
  node: ParserNode;
}

export function buildHighlightInfo(tree: ParserTree, language: Language) {
  const result: HighlightInfo[] = [];
  // debugger;

  // Travel tree and make decorations
  const stack: ParserNode[] = [];
  let node = tree.rootNode.firstChild;
  while (stack.length > 0 || node) {
    // Go deeper
    if (node) {
      stack.push(node);
      node = node.firstChild;
    }
    // Go back
    else {
      node = stack.pop() ?? null;
      if (!node) continue;

      // debugger;
      let type = node.type;
      // if (!(node.isNamed as unknown as () => boolean)()) type = '"' + type + '"';
      if (!node.isNamed) type = '"' + type + '"';
      // Simple one-level terms
      let term: Term | null = null;
      if (!language.complexTerms.includes(type)) {
        term = language.simpleTerms[type];
      }
      // Complex terms require multi-level analyzes
      else {
        // Build complex scopes
        let desc = type;
        let scopes = [desc];
        let parent = node.parent;
        for (let i = 0; i < language.complexDepth && parent; i++) {
          let parentType = parent.type;
          // if (!(parent.isNamed as unknown as () => boolean)()) parentType = '"' + parentType + '"';
          if (!parent.isNamed) parentType = '"' + parentType + '"';
          desc = parentType + ' > ' + desc;
          scopes.push(desc);
          parent = parent.parent;
        }
        // If there is also order complexity
        if (language.complexOrder) {
          let index = 0;
          let sibling = node.previousSibling;
          while (sibling) {
            if (sibling.type === node.type) index++;
            sibling = sibling.previousSibling;
          }

          let rindex = -1;
          sibling = node.nextSibling;
          while (sibling) {
            if (sibling.type === node.type) rindex--;
            sibling = sibling.nextSibling;
          }

          const orderScopes: string[] = [];
          for (let i = 0; i < scopes.length; i++)
            orderScopes.push(scopes[i], scopes[i] + '[' + index + ']', scopes[i] + '[' + rindex + ']');
          scopes = orderScopes;
        }
        // Use most complex scope
        for (const d of scopes) if (d in language.complexScopes) term = language.complexScopes[d];
      }

      // If term is found add decoration
      if (term != null && terms.includes(term)) {
        result.push({ term, node });
      }

      // Go right
      node = node.nextSibling;
    }
  }

  return result;
}

export function buildDecorations(tree: ParserTree, language: Language) {
  if (!Monaco) throw new TypeError('Please provide the monaco-editor module via provideMonacoModule() first.');

  const decorations: Record<Term, MonacoModule.Range[]> = Object.fromEntries(
    terms.map((term) => [term, []]),
  ) as unknown as Record<Term, MonacoModule.Range[]>;

  const highlightInfo = buildHighlightInfo(tree, language);
  for (const { term, node } of highlightInfo) {
    decorations[term].push(
      new Monaco.Range(
        node.startPosition.row + 1,
        node.startPosition.column + 1,
        node.endPosition.row + 1,
        node.endPosition.column + 1,
      ),
    );
  }

  return decorations;
}
