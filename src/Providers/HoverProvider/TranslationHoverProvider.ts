import {
  TextDocument,
  Position,
  CancellationToken,
  Hover,
  HoverProvider,
  Range,
  WorkspaceConfiguration,
} from 'vscode';
import { getStringContentsFromToken, stringParser } from '../../Parser';
import { Translations } from '../../Translations';
import { hoverRenderer } from '../../TranslationRenderer';
import { ConfigObserver } from '../../Observers';

export class TranslationHoverProvider implements HoverProvider {
  private parser = stringParser;
  private configObserver = new ConfigObserver('hover');
  private isEnabled = this.configObserver?.current?.get('enabled');

  public static supportedLanguages = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact',
  ];

  private refresh(config?: WorkspaceConfiguration) {
    config ??= this.configObserver.current;
    this.isEnabled = config?.get('enabled');
  }

  constructor() {
    if (!Translations.isLoaded) {
      Translations.init({});
    }

    // TODO: need to unsubscribe at some point
    this.configObserver.subscribe((config) => this.refresh(config));
  }

  // public updateTranslations(translations: NormalizedTranslations | null) {
  //   // Translations.refresh()
  // }

  public provideHover(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Thenable<Hover> {
    if (this.isEnabled === undefined) {
      this.refresh();
    }

    if (!this.isEnabled || !Translations.isLoaded) {
      return Promise.reject();
    }

    const line = document.lineAt(position).text;

    if (token.isCancellationRequested) {
      return Promise.reject();
    }

    const tokens = this.parser.parse(line, 'quote');
    let t = tokens.find(
      (t) =>
        t.indices[0] <= position.character && t.indices[1] >= position.character
    );

    if (!t) {
      return Promise.reject();
    }

    t = getStringContentsFromToken(t);

    if (!Translations.exists(t.text)) {
      return Promise.reject();
    }

    if (token.isCancellationRequested) {
      return Promise.reject();
    }

    const value = Translations.getAllTranslations(t.text);

    if (!value) {
      return Promise.reject();
    }

    if (token.isCancellationRequested) {
      return Promise.reject();
    }

    return Promise.resolve(
      new Hover(
        hoverRenderer(value),
        new Range(
          new Position(position.line, t.indices[0]),
          new Position(position.line, t.indices[1] + 1)
        )
      )
    );
  }
}
