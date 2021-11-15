// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { JavascriptHoverProvider } from "./HoverProvider";
import { createClient, CreateClientParams, EntryCollection } from "contentful";
import { NormalizedTranslationValue, NormalizedTranslations } from "./types";

const consolidateKeys = (
  array: [key: string, value: NormalizedTranslationValue[]][]
) => {
  let normalizedTranslationsArray = array.slice();

  normalizedTranslationsArray.sort((a, b) =>
    (("" + a[0]) as string).localeCompare(b[0] as string)
  );

  let i = 0;
  while (i < normalizedTranslationsArray.length) {
    const key = normalizedTranslationsArray[i][0];
    let j = i + 1;
    while (
      j < normalizedTranslationsArray.length &&
      normalizedTranslationsArray[j][0] === key
    ) {
      normalizedTranslationsArray[i][1] = (
        normalizedTranslationsArray[i][1] as NormalizedTranslationValue[]
      ).concat(
        normalizedTranslationsArray[j][1] as NormalizedTranslationValue[]
      );

      normalizedTranslationsArray.splice(j, 1);
    }
    ++i;
  }

  return normalizedTranslationsArray;
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  console.log("activating");
  try {
    let translations: NormalizedTranslations | null = null;

    const config = vscode.workspace.getConfiguration("translations");

    if (config.get("useContentfulTranslations.enabled")) {
      const contentfulConfig: CreateClientParams | undefined = config.get(
        "useContentfulTranslations.contentfulConfig"
      );

      if (!contentfulConfig) {
        return;
      }

      const contentfulClient = createClient(contentfulConfig);

      let translationEntries: EntryCollection<unknown> | undefined = undefined;
      let aggregateArray: any[] = [];

      let i = 0;
      const limit = 100;
      let total = 100;
      while (
        (translationEntries === undefined ||
          translationEntries.items.length === limit) &&
        i * limit < total
      ) {
        translationEntries = await contentfulClient.getEntries({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          content_type:
            config.get("useContentfulTranslations.contentType") ??
            "translation",
          locale: "*",
          skip: i * limit,
          limit,
        });

        if (total !== translationEntries.total) {
          total = translationEntries.total;
        }

        aggregateArray = aggregateArray.concat(translationEntries.items);
        ++i;
      }

      const translationArray: [
        key: string,
        value: NormalizedTranslationValue[]
      ][] = aggregateArray
        .map((entry) => {
          const { key, namespace, text } = entry.fields as {
            key: { "en-US": string };
            namespace: { "en-US": string[] };
            text: {
              [languageCode: string]: string;
            };
          };

          if (
            !key ||
            !namespace ||
            !text ||
            !key["en-US"] ||
            !namespace["en-US"]
          ) {
            return undefined;
          }

          return [key["en-US"], [{ namespace: namespace["en-US"], text }]];
        })
        .filter(
          (obj): obj is [key: string, value: NormalizedTranslationValue[]] =>
            obj !== undefined
        );

      translations = Object.fromEntries(consolidateKeys(translationArray));
    } else {
      const filePath: string | undefined = config.get("translationsFileName");
      const translationFileStructure: string =
        config.get("translationFileStructure") ??
        '{ "[namespace]": { "[key]": { "[languageCode]": "[translation]" } } }';

      if (!filePath || !translationFileStructure) {
        return;
      }

      const translationFileStructureDefaults = config.get(
        "translationFileStructureDefaults"
      ) as { namespace: string; languageCode: string };

      const fileStructure = JSON.parse(
        translationFileStructure.replace(/[\[\]]/g, "")
      );

      //  vscode.workspace.fs.readFile()
      const fileUris = await vscode.workspace.findFiles(
        "**/" + filePath,
        "**/node_modules/**",
        1
      );
      if (fileUris.length === 0) {
        // TODO: error
        return;
      }

      const buffer = Buffer.from(
        await vscode.workspace.fs.readFile(fileUris[0])
      );

      const translationFileJson = JSON.parse(buffer.toString());

      let normalizedTranslations: NormalizedTranslations = {}; // { [key]: [ { namespace: [], text: { [languageCode]: '' }}, ... ] }

      if ("key" in fileStructure) {
        if (
          typeof fileStructure["key"] === "object" &&
          "languageCode" in fileStructure["key"]
        ) {
          // "{ \"[key]\": { \"[languageCode]\": \"[translation]\" } }",
          const translationsJson = JSON.parse(
            JSON.stringify(translationFileJson)
          ) as {
            [key: string]: { [languageCode: string]: string };
          };
          normalizedTranslations = Object.fromEntries(
            Object.entries(translationsJson).map(([key, value]) => [
              key,
              [
                {
                  namespace: [translationFileStructureDefaults.namespace],
                  text: value,
                },
              ],
            ])
          );
        } else {
          console.log("fileStructure: {key: value}");
          // "{ \"[key]\": \"[translation]\" }"
          const translationsJson = JSON.parse(
            JSON.stringify(translationFileJson)
          ) as {
            [key: string]: string;
          };
          normalizedTranslations = Object.fromEntries(
            Object.entries(translationsJson).map(([key, value]) => [
              key,
              [
                {
                  namespace: [translationFileStructureDefaults.namespace],
                  text: {
                    [translationFileStructureDefaults.languageCode]: value,
                  },
                },
              ],
            ])
          );
        }
        console.log(normalizedTranslations);
      } else {
        // "{ \"[namespace]\": { \"[key]\": { \"[languageCode]\": \"[translation]\" } } }"
        const translationsJson = JSON.parse(
          JSON.stringify(translationFileJson)
        ) as {
          [namespace: string]: {
            [key: string]: { [languageCode: string]: string };
          };
        };
        let normalizedTranslationsArray = Object.entries(translationsJson)
          .map(
            ([namespace, value]) =>
              Object.entries(value).map(([key, translation]) => [
                key,
                [
                  {
                    namespace: [namespace],
                    text: translation,
                  },
                ],
              ]) as [key: string, value: NormalizedTranslationValue[]][]
          )
          .flat(1);

        normalizedTranslations = Object.fromEntries(
          consolidateKeys(normalizedTranslationsArray)
        );
      }

      translations = JSON.parse(JSON.stringify(normalizedTranslations));
    }

    let disposable = vscode.languages.registerHoverProvider(
      JavascriptHoverProvider.supportedLanguages,
      new JavascriptHoverProvider(translations)
    );

    context.subscriptions.push(disposable);
  } catch (e) {
    console.log("error in activate:", e);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
