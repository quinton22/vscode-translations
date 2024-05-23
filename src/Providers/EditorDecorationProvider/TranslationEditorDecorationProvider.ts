import {
  TextEditorDecorationType,
  window,
  DecorationRangeBehavior,
  Disposable,
  TextEditor,
  workspace,
  ThemeColor,
  Range,
} from 'vscode';
import { getStringContentsFromToken, stringParser } from '../../Parser';
import { Translations } from '../../Translations';
import { ConfigObserver } from '../../Observers';

export enum DecorationPosition {
  eol = 'endOfLine',
  adj = 'adjacent',
}

const decorationType: TextEditorDecorationType =
  window.createTextEditorDecorationType({
    rangeBehavior: DecorationRangeBehavior.OpenOpen,
  });

export class TranslationEditorDecorationProvider implements Disposable {
  private editor: TextEditor | undefined;
  private parser = stringParser;
  private listener?: Disposable;
  private unsubscribe?: () => void;
  private configObserver = new ConfigObserver('inline');
  private isEnabled = false;

  constructor() {
    this.enable();
    this.unsubscribe = this.configObserver.subscribe((config) => {
      const enabled = config.get('enabled');
      if (enabled && !this.isEnabled) {
        this.enable();
      } else if (!enabled && this.isEnabled) {
        this.disable();
      }

      this.refresh();
    });
  }

  private enable() {
    this.updateEditor(window.activeTextEditor);
    this.listener = Disposable.from(
      window.onDidChangeActiveTextEditor(this.updateEditor.bind(this)),
      workspace.onDidSaveTextDocument(this.refresh.bind(this)),
      Translations.onLoad(this.refresh.bind(this))
    );
    this.isEnabled = true;
  }

  private disable() {
    this.clear();
    this.listener?.dispose();
  }

  dispose() {
    this.disable();
    this.unsubscribe?.();
  }

  updateEditor(editor: TextEditor | undefined) {
    if (this.editor === editor) {
      return;
    }

    if (this.editor !== editor) {
      this.clear();
    }

    this.editor = editor;
    this.create();
  }

  refresh() {
    this.clear();
    this.create();
  }

  create() {
    console.log('[Translations]', 'create');
    console.log('[Translations]', 'create', Translations.isLoaded);

    if (
      !this.editor ||
      !Translations.isLoaded ||
      !TranslationEditorDecorationProvider.supportedLanguages.includes(
        this.editor!.document.languageId
      )
    ) {
      return;
    }

    const tokens = this.parser
      .parse(this.editor.document.getText(), 'quote')
      .map((t) => getStringContentsFromToken(t))
      .filter((t) => Translations.exists(t.text));

    this.editor.setDecorations(
      decorationType,
      tokens.map((t) => {
        const pos =
          this.configObserver?.current?.get<DecorationPosition>('position');

        const isEol = pos === DecorationPosition.eol;

        const range = new Range(
          this.editor!.document.positionAt(t.indices[0]),
          this.editor!.document.positionAt(t.indices[1] + 1)
        );

        const eolRange = new Range(
          range.start,
          this.editor!.document.lineAt(range.end).range.end
        );

        const after = {
          ...(isEol && {
            fontStyle: 'italic',
            margin: '0 0 0 1em',
          }),
          contentText: `${isEol ? '' : '|'}${Translations.translate(t.text)}`,
          color: new ThemeColor('translations.decorationTextColor'),
        };

        return {
          range: pos === DecorationPosition.eol ? eolRange : range,
          // don't need this since it is included in hover provider
          // hoverMessage: hoverRenderer(Translations.getAllTranslations(t.text)),
          renderOptions: {
            after,
          },
        };
      })
    );
  }

  clear() {
    this.editor?.setDecorations(decorationType, []);
  }

  public static supportedLanguages = [
    'typescript',
    'typescriptreact',
    'javascript',
    'javascriptreact',
  ];
}
