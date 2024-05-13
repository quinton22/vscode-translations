# vscode-translations

This extension uses i18next to display localized text for translation keys in code.

## Features

- Inline translation appended to the end of a line
- Translation on hover showing all translated values

<!--
TODO:
Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.
-->

## Extension Settings

- `translations.hover`
  - `enabled`: enable/disable display on hover over a localization key
- `translations.inline`
  - `enabled`: enable/disable inline value of key in default language
  - `position`: position to show the value of the key, either end of line or adjacent to key
- `translations.backend`
  - `list`: list of backends to use and the order in which to use them. Currently supports `File System` and `Contentful`
  - `fileSystemOptions`: options to pass to the file system backend
  - `contentfulOptions`: options to pass to the contentful backend
- `translations.i18nOptions`
  - `namespaces`: namespaces to search for translations
  - `supportedLngs`: list of all supported languages for translating purposes
  - `defaultNs`: default namespace for translations, will default to `translation`
  - `fallbackLng`: fallback language for translations, defaults to `en-US`

## Known Issues

## Release Notes

### 0.0.1

---

<!--
Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
-->
