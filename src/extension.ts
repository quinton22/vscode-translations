// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, languages, Disposable } from 'vscode';
import {
  TranslationEditorDecorationProvider,
  TranslationHoverProvider,
} from './Providers';

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
export async function activate(context: ExtensionContext) {
  // const configObserver = new ConfigObserver();

  // const codeLensProvider = languages.registerCodeLensProvider(
  //   TranslationCodeLensProvider.supportedLanguages,
  //   new TranslationCodeLensProvider()
  // );

  const hoverProvider = languages.registerHoverProvider(
    TranslationHoverProvider.supportedLanguages,
    new TranslationHoverProvider()
  );

  const decoratorProvider = new TranslationEditorDecorationProvider();

  const commands: Disposable[] = [
    // commands.registerCommand(
    //   "translations.updateTranslations",
    //   async () => {
    //     window.showInformationMessage("Updating translations");
    //     translationHoverProvider.updateTranslations(
    //       await Translations.refreshTranslations()
    //     );
    //     window.showInformationMessage("Translations updated");
    //   }
    // ),
    // TODO:
    // commands.registerCommand(
    //   'translations.displayTranslations',
    //   (translations: NormalizedTranslationValue[]) => {
    //     window.showInformationMessage(
    //       translations
    //         .map((v) =>
    //           Object.entries(v.text)
    //             .map(
    //               ([lng, txt], i) =>
    //                 `${
    //                   i === 0
    //                     ? v.namespace
    //                     : new Array(v.namespace.length).fill('-').join('')
    //                 } ${lng}: ${txt}`
    //             )
    //             .join('\n')
    //         )
    //         .join('\n')
    //     );
    //   }
    // ),
    // TODO
    // commands.registerCommand(
    //   'translations.searchTranslations',
    //   async () => {
    //     const input = await window.showInputBox({
    //       title: 'Search Translations',
    //     });
    //     if (!input) {
    //       window.showWarningMessage('No input given');
    //       return;
    //     }
    //     const searchResults = ['']; // await Translations.search(input);
    //     window.showInformationMessage(
    //       `Results:\n\n${searchResults.join('\n')}`
    //     );
    //   }
    // ),
  ];

  context.subscriptions.push(
    ...commands,
    // codeLensProvider,
    hoverProvider,
    decoratorProvider
  );
}
// this method is called when your extension is deactivated
export function deactivate() {}
