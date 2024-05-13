import { MarkdownString } from 'vscode';
import { NormalizedTranslationValue } from '../types';
import { TranslationRenderFn } from './TranslationRenderer';

const initial = `| Namespaces\u00a0\u00a0\u200b | Language\u00a0\u00a0\u200b | Text\u00a0\u00a0\u200b |
|:---|:---|:---|
`;

export const hoverRenderer: TranslationRenderFn<MarkdownString> = (
  translations: NormalizedTranslationValue[]
) => {
  return new MarkdownString(
    `${initial}${translations
      .map((t) =>
        Object.entries(t.text)
          .map(
            ([lang, text], i) =>
              `| ${i === 0 ? t.namespace : ' '} | ${lang} | ${text} |`
          )
          .join('\n')
      )
      .join('\n')}`
  );
};
