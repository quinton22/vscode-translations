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
import { hoverRenderer } from '../../TranslationRenderer';
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
  private listener: Disposable;
  private configObserver = new ConfigObserver('inline');

  constructor() {
    this.updateEditor(window.activeTextEditor);
    this.listener = Disposable.from(
      window.onDidChangeActiveTextEditor(this.updateEditor.bind(this)),
      workspace.onDidSaveTextDocument(this.refresh.bind(this)),
      Translations.onLoad(this.refresh.bind(this))
    );
  }

  dispose() {
    this.clear();
    this.listener.dispose();
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
        // TODO: setting for position of inline text

        const pos =
          this.configObserver?.current?.get<DecorationPosition>('position');

        const range = new Range(
          this.editor!.document.positionAt(t.indices[0]),
          this.editor!.document.positionAt(t.indices[1] + 1)
        );

        const eolRange = new Range(
          range.start,
          this.editor!.document.lineAt(range.end).range.end
        );

        return {
          range: pos === DecorationPosition.eol ? eolRange : range,
          hoverMessage: hoverRenderer(Translations.getAllTranslations(t.text)),
          renderOptions: {
            after: {
              fontStyle: 'italic',
              margin: '0 0 0 1em',
              contentText: Translations.translate(t.text),
              color: new ThemeColor('translations.decorationTextColor'),
            },
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
