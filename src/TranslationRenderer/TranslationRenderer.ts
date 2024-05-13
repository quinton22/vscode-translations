import { MarkdownString } from 'vscode';
import { NormalizedTranslationValue } from '../types';

export type TranslationRenderFn<T extends string | MarkdownString> = (
  translations: NormalizedTranslationValue[]
) => T;
