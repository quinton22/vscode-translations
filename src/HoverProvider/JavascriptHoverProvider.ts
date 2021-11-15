import {
  TextDocument,
  Position,
  CancellationToken,
  Hover,
  HoverProvider,
  Uri,
  MarkdownString,
} from "vscode";
import { NormalizedTranslations, NormalizedTranslationValue } from "../types";

export class JavascriptHoverProvider implements HoverProvider {
  private translations: NormalizedTranslations | null = null;
  constructor(translations: NormalizedTranslations | null) {
    this.translations =
      translations !== null ? JSON.parse(JSON.stringify(translations)) : null;
  }

  private buildHoverString(translationArray: NormalizedTranslationValue[]) {
    const row = (
      _: TemplateStringsArray,
      stringArray: string[],
      noSpace = false
    ) => {
      const space = noSpace ? "" : " ";
      return `|${space}${stringArray.join(`${space}|${space}`)}${space}|\n`;
    };

    const str = new MarkdownString();

    const columnNames = [
      "Namespaces\u00a0\u00a0\u200b",
      "Language\u00a0\u00a0\u200b",
      "Text\u00a0\u00a0\u200b",
    ];
    const headerMarkings = [":---", ":---", ":---"];

    str.appendMarkdown(row`${columnNames}`);
    str.appendMarkdown(row`${headerMarkings}${true}`);

    for (const translationObj of translationArray) {
      let i = 0;
      for (const [lang, text] of Object.entries(translationObj.text)) {
        str.appendMarkdown(
          row`${[
            i++ === 0 ? translationObj.namespace.join(", ") : " ",
            lang,
            text.replace(/\n/g, " "),
          ]}`
        );
      }
    }

    return str;
  }

  public static supportedLanguages = [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
  ];

  public provideHover(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Thenable<Hover> {
    /*
      const searchCommandUri = vscode.Uri.parse(
        `command:workbench.action.findInFiles?${encodeURIComponent(JSON.stringify(searchOptions))}`
      );
     
      const contents = new vscode.MarkdownString(`[Search String](${searchCommandUri})`);
      contenst.isTrusted = true;
     */
    token.onCancellationRequested(() => Promise.reject());

    const line = document.lineAt(position).text;
    const strRegEx = /["'`]/g;

    const indices = [...line.matchAll(strRegEx)]
      .map((match) => match.index)
      .filter((i): i is number => i !== undefined);

    if (indices.length < 2) {
      return Promise.reject();
    }

    const firstPositiveIndex = indices
      .map((i) => i - position.character)
      .findIndex((v) => v > 0);

    if (
      firstPositiveIndex <= 0 || // no string close
      ((firstPositiveIndex - 1) % 2 === 1 &&
        line.charAt(indices[firstPositiveIndex - 1] + 1).match(/\s/)) // no space
    ) {
      return Promise.reject();
    }

    const [strBegin, strEnd] = indices.slice(firstPositiveIndex - 1);

    if (line.charAt(strBegin) !== line.charAt(strEnd)) {
      // just return if the ones we found arent the same
      return Promise.reject();
    }

    let str = line.substring(strBegin + 1, strEnd);
    if (line.charAt(strBegin) === "`") {
      str = str.replace(/\${.*?}/g, "");
    }
    const [key, ns] = str.split(":", 2).reverse();

    if (!this.translations?.[key]) {
      return Promise.reject();
    }

    if (ns) {
      const matchedNamespace = this.translations[key].find(({ namespace }) =>
        namespace.includes(ns)
      );

      if (matchedNamespace) {
        return Promise.resolve(
          new Hover(this.buildHoverString([matchedNamespace]))
        );
      }
    }

    return Promise.resolve(
      new Hover(this.buildHoverString(this.translations[key]))
    );
  }
}
