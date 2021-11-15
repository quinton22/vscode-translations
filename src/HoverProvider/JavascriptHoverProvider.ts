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
  private defaultNamespace: string;
  constructor(
    translations: NormalizedTranslations | null,
    defaultNamespace?: string
  ) {
    this.translations =
      translations !== null ? JSON.parse(JSON.stringify(translations)) : null;
    this.defaultNamespace = defaultNamespace ?? "translation";
  }

  private translate = (
    keyAndNamespace: string,
    options?: Record<string, any>
  ) => {
    const [key, ns] = keyAndNamespace.split(":", 2).reverse();
    if (!this.translations?.[key]) {
      return undefined;
    }

    let returnArray = this.translations[key];

    if (ns) {
      const matchedNamespace = this.translations[key].find(({ namespace }) =>
        namespace.includes(ns)
      );

      if (matchedNamespace) {
        returnArray = [matchedNamespace];
      }
    }

    if (options) {
      // attempt replace
      returnArray = returnArray.map(({ namespace, text }) => {
        return {
          namespace,
          text: Object.fromEntries(
            Object.entries(text).map(([lang, val]) => {
              let newVal = val;
              for (const [optKey, optVal] of Object.entries(options)) {
                newVal = newVal.replace(`{{${optKey}}}`, optVal);
              }
              return [lang, newVal];
            })
          ),
        };
      });
    }

    return returnArray;
  };

  private substituteTranslations = (
    ...args: [translation: string, lang: string, maxRecursiveDepth?: number]
  ) => this.recursivelySubstituteTranslations(...args, 0);

  private recursivelySubstituteTranslations = (
    translation: string,
    lang: string,
    maxRecursiveDepth = 2,
    recursiveDepth = 0
  ): string => {
    const removeSpaces = translation.replace(/\n/g, " ");
    let regex = /[^\\]?\$t\(\s*(.*?)\s*[,]?\s*({.*?})?\)/g;
    let splitRegex = /[\\]{0}\$t\(\s*.*?\s*[,]?\s*(?:{.*?})?\)/;

    console.log({ removeSpaces });

    let arrayOfMatches;
    const arrayOfKeys = [];
    const arrayOfOptions = [];
    while ((arrayOfMatches = regex.exec(removeSpaces)) !== null) {
      arrayOfKeys.push(arrayOfMatches[1]);
      arrayOfOptions.push(arrayOfMatches[2]);
    }

    const removedMatches = removeSpaces.split(splitRegex);
    const insertMatches = [];

    for (let i = 0; i < arrayOfKeys.length; ++i) {
      const innerKey = arrayOfKeys[i];
      const innerOptions = arrayOfOptions[i];
      const innerTranslationArray = this.translate(
        innerKey,
        innerOptions ? JSON.parse(innerOptions) : undefined
      );

      let innerTranslation;

      if (innerTranslationArray) {
        innerTranslation =
          innerTranslationArray.length === 1
            ? innerTranslationArray[0].text[lang]
            : innerTranslationArray.find(({ namespace }) =>
                namespace.includes(this.defaultNamespace)
              )?.text[lang];
      }

      if (!innerTranslation) {
        innerTranslation = `$t(${innerKey}${
          innerOptions ? `, ${JSON.stringify(innerOptions)}` : ""
        })`;
      }

      insertMatches.push(innerTranslation);
    }

    console.log({ insertMatches, removedMatches });

    const returnString =
      insertMatches.length > 0
        ? insertMatches.map((value, i) => removedMatches[i] + value).join("")
        : removedMatches.join("");

    if (recursiveDepth >= maxRecursiveDepth || !returnString.match(regex)) {
      return returnString;
    } else {
      return this.recursivelySubstituteTranslations(
        returnString,
        lang,
        maxRecursiveDepth,
        ++recursiveDepth
      );
    }
  };

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
            this.substituteTranslations(text, lang),
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

    const returnValue = this.translate(str);

    if (!returnValue) {
      return Promise.reject();
    }

    return Promise.resolve(new Hover(this.buildHoverString(returnValue)));
  }
}
