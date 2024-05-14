import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  ProviderResult,
  Range,
  TextDocument,
} from 'vscode';
import { getStringContentsFromToken, stringParser } from '../../Parser';
import { Translations } from '../../Translations/Translations';
import { ConfigObserver } from '../../Observers/ConfigObserver';

export class TranslationCodeLensProvider implements CodeLensProvider {
  private parser = stringParser;
  private configObserver = new ConfigObserver('codelens');
  private isEnabled = this.configObserver?.current?.get('enabled');

  constructor() {
    if (!Translations.isLoaded) {
      Translations.init({});
    }

    // TODO: need to unsubscribe at some point
    this.configObserver.subscribe((config) => {
      this.isEnabled = config.get('enabled');
    });
  }

  provideCodeLenses(
    document: TextDocument,
    token: CancellationToken
  ): ProviderResult<CodeLens[]> {
    if (!this.isEnabled) {
      Promise.reject();
    }

    token.onCancellationRequested(() => Promise.reject());

    const results = this.parser
      .parse(document.getText(), 'quote')
      .map((t) => getStringContentsFromToken(t));

    return results
      .filter((r) => Translations.exists(r.text))
      .map((r) => {
        const p1 = document.positionAt(r.indices[0]);
        const p2 = document.positionAt(r.indices[1]);

        const range =
          p1.line === p2.line
            ? new Range(p1, p2)
            : new Range(p1, document.lineAt(p1.line).range.end);

        const tooltip = Translations.translate(r.text);

        if (!tooltip) {
          return;
        }

        let title = tooltip.substring(0, 30);
        title += tooltip.length > title.length ? '...' : '';

        const translations = Translations.getAllTranslations(r.text);

        return new CodeLens(range, {
          title,
          tooltip,
          command: 'translations.displayTranslations',
          arguments: [translations],
        });
      })
      .filter(Boolean) as CodeLens[];
  }

  // resolveCodeLens?(
  //   codeLens: CodeLens,
  //   token: CancellationToken
  // ): ProviderResult<CodeLens> {
  //   throw new Error('Method not implemented.');
  // }

  public static supportedLanguages = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact',
  ];
}
