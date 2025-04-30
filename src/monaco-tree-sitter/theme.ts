import * as MonacoModule from 'monaco-editor';

import { Term } from './highlighter';

// import { Monaco } from './monaco';

export interface ThemeConfig {
  monacoTreeSitter: Record<
    Term,
    | string
    | {
        color: string;
        extraCssStyles?: string;
      }
  >;
  base: MonacoModule.editor.IStandaloneThemeData;
}

export class Theme {
  private static tag: HTMLStyleElement;
  public static config: ThemeConfig;
  private static readonly cssClassNamePrefix = 'mts-';

  private constructor() {
    //
  }

  /**
   * Load a theme. The theme will be used for ALL monaco editors.
   * A theme provides definitions for both MonacoTreeSitter and Monaco Editor itself.
   *
   * Notice that Monaco Editor doesn't support using different themes in different editor
   * instances, so we don't support it either.
   *
   * Theme config files are in the "themes" directory.
   *
   * @param config The JSON.parse()-ed theme config.
   */
  public static load(config: ThemeConfig, name: string = 'theme') {
    // if (Monaco) {
    //   Monaco.editor.defineTheme('monaco-tree-sitter', config.base);
    //   Monaco.editor.setTheme('monaco-tree-sitter');
    // }

    if (!this.tag) {
      this.tag = document.createElement('style');
      this.tag.setAttribute('type', 'text/css');
      this.tag.setAttribute('data-monaco-tree-sitter', name);
      document.head.appendChild(this.tag);
    }

    this.config = config;
    this.tag.innerHTML = this.generateCss();
  }

  /**
   * Only monaco-tree-sitter's theme will be generated to CSS.
   */
  public static generateCss(classNamePrefix: string = this.cssClassNamePrefix) {
    return Object.keys(this.config.monacoTreeSitter)
      .map((t: string) => {
        const term = t as Term;
        return `span.${this.getClassNameOfTerm(term, classNamePrefix)}{${this.generateStyleOfTerm(term)}}`;
      })
      .join('\n');
  }

  public static generateStyleOfTerm(term: Term) {
    const style = this.config.monacoTreeSitter[term];
    if (!style) return '';
    return typeof style === 'string'
      ? `color:${style}`
      : `color:${style.color};${style.extraCssStyles ? style.extraCssStyles : ''}`;
  }

  public static getClassNameOfTerm(term: Term, classNamePrefix: string = this.cssClassNamePrefix) {
    return classNamePrefix + term;
  }

  public static getColorOfTerm(term: Term) {
    const style = this.config.monacoTreeSitter[term];
    if (typeof style === 'object') {
      return style.color;
    } else {
      return style;
    }
  }
}
