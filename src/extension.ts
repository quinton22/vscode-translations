// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
  TranslationCodeLensProvider,
  TranslationEditorDecorationProvider,
  TranslationHoverProvider,
} from './Providers';
import { NormalizedTranslationValue } from './types';
import { ConfigObserver } from './Observers/ConfigObserver';

// TODO: annotation:
// const annotationDecoration: TextEditorDecorationType = window.createTextEditorDecorationType({
// 	after: {
// 		margin: '0 0 0 3em',
// 		textDecoration: 'none',
// 	},
// 	rangeBehavior: DecorationRangeBehavior.OpenOpen,
// });

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const configObserver = new ConfigObserver();

  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    TranslationCodeLensProvider.supportedLanguages,
    new TranslationCodeLensProvider()
  );

  const hoverProvider = vscode.languages.registerHoverProvider(
    TranslationHoverProvider.supportedLanguages,
    new TranslationHoverProvider()
  );

  const decoratorProvider = new TranslationEditorDecorationProvider();

  const commands = [
    // vscode.commands.registerCommand(
    //   "translations.updateTranslations",
    //   async () => {
    //     vscode.window.showInformationMessage("Updating translations");
    //     translationHoverProvider.updateTranslations(
    //       await Translations.refreshTranslations()
    //     );

    //     vscode.window.showInformationMessage("Translations updated");
    //   }
    // ),

    // TODO:
    vscode.commands.registerCommand(
      'translations.displayTranslations',
      (translations: NormalizedTranslationValue[]) => {
        vscode.window.showInformationMessage(
          translations
            .map((v) =>
              Object.entries(v.text)
                .map(
                  ([lng, txt], i) =>
                    `${
                      i === 0
                        ? v.namespace
                        : new Array(v.namespace.length).fill('-').join('')
                    } ${lng}: ${txt}`
                )
                .join('\n')
            )
            .join('\n')
        );
      }
    ),

    // TODO
    vscode.commands.registerCommand(
      'translations.searchTranslations',
      async () => {
        const input = await vscode.window.showInputBox({
          title: 'Search Translations',
        });

        if (!input) {
          vscode.window.showWarningMessage('No input given');
          return;
        }

        const searchResults = ['']; // await Translations.search(input);

        vscode.window.showInformationMessage(
          `Results:\n\n${searchResults.join('\n')}`
        );
      }
    ),
  ];

  context.subscriptions.push(
    ...commands,
    codeLensProvider,
    hoverProvider,
    decoratorProvider
  );
}
// this method is called when your extension is deactivated
export function deactivate() {}
