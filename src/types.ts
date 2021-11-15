export type NormalizedTranslationValue = {
  namespace: string[];
  text: { [languageCode: string]: string };
};

export type NormalizedTranslations = {
  [key: string]: NormalizedTranslationValue[];
};
