import debounce from 'lodash/debounce';
import * as MonacoModule from 'monaco-editor';
import { type Point as ParserPoint, type Tree as ParserTree } from 'web-tree-sitter';

import { buildDecorations, Term } from './highlighter';
import { Language } from './language';
import { provideMonacoModule } from './monaco';
import { Theme } from './theme';

export * from './highlight';
export * from './highlighter';
export * from './language';
export * from './theme';

function monacoPositionToParserPoint(position: MonacoModule.Position): ParserPoint {
  return { row: position.lineNumber, column: position.column };
}

export class MonacoTreeSitter implements MonacoModule.IDisposable {
  public readonly editor: MonacoModule.editor.IStandaloneCodeEditor;
  private tree: ParserTree | null;
  private language: Language | null;
  private monacoDecorationKeys: string[] = [];
  private buildHighlightDebounced: () => void;
  public dispose: () => void;

  constructor(
    Monaco: typeof MonacoModule,
    editor: MonacoModule.editor.IStandaloneCodeEditor,
    language: Language,
    debounceUpdate: number = 15,
  ) {
    this.editor = editor;
    this.language = language;

    provideMonacoModule(Monaco);

    this.tree = language ? language.parser.parse(editor.getValue()) : null;
    this.buildHighlightDebounced =
      debounceUpdate == null
        ? this.buildHighlight
        : debounce(this.buildHighlight.bind(this), debounceUpdate);

    const eventListener = editor
      .getModel()
      ?.onDidChangeContent(this.onEditorContentChange.bind(this));
    this.dispose = () => {
      eventListener?.dispose();
      this.language = this.tree = null;
      this.buildHighlight();
    };

    this.buildHighlight();
  }

  private onEditorContentChange(e: MonacoModule.editor.IModelContentChangedEvent) {
    const model = this.editor.getModel();
    if (!model || !this.language || !this.tree) return;
    if (e.changes.length === 0) return;

    for (const change of e.changes) {
      const startIndex = change.rangeOffset;
      const oldEndIndex = change.rangeOffset + change.rangeLength;
      const newEndIndex = change.rangeOffset + change.text.length;
      const startPosition = monacoPositionToParserPoint(model.getPositionAt(startIndex));
      const oldEndPosition = monacoPositionToParserPoint(model.getPositionAt(oldEndIndex));
      const newEndPosition = monacoPositionToParserPoint(model.getPositionAt(newEndIndex));
      this.tree.edit({
        startIndex,
        oldEndIndex,
        newEndIndex,
        startPosition,
        oldEndPosition,
        newEndPosition,
      });
    }
    this.tree = this.language.parser.parse(this.editor.getValue(), this.tree); // TODO: Don't use getText, use Parser.Input
    this.buildHighlightDebounced(); // TODO: Build highlight incrementally
  }

  private buildHighlight() {
    if (!this.language || !this.tree) return;

    const decorations = this.language ? buildDecorations(this.tree, this.language) : null;

    const monacoDecorations: MonacoModule.editor.IModelDeltaDecoration[] = [];
    if (decorations)
      for (const [term, ranges] of Object.entries(decorations)) {
        const options: MonacoModule.editor.IModelDecorationOptions = {
          inlineClassName: Theme.getClassNameOfTerm(term as Term),
        };
        for (const range of ranges) {
          monacoDecorations.push({ range, options });
        }
      }
    this.monacoDecorationKeys = this.editor.deltaDecorations(
      this.monacoDecorationKeys,
      monacoDecorations,
    );
  }

  public changeLanguage(language: Language) {
    this.language = language;
    this.tree = language ? language.parser.parse(this.editor.getValue()) : null;
    this.buildHighlight();
  }

  /**
   * Refresh the editor's highlight. Usually called after switching theme.
   */
  public refresh() {
    this.buildHighlight();
  }
}
