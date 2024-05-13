import * as assert from 'assert';
import { hoverRenderer } from '../../TranslationRenderer';
import { NormalizedTranslationValue } from '../../types';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';

suite('HoverRenderer Test Suite', () => {
  const mockTranslations: NormalizedTranslationValue[] = [
    {
      namespace: 'translation',
      text: {
        'en-US': 'hello',
        'es-ES': 'hola',
      },
    },
    {
      namespace: 'other',
      text: {
        'en-US': 'hi',
        'es-ES': 'hola',
      },
    },
  ];

  test('Should output in expected format', () => {
    assert.strictEqual(hoverRenderer(mockTranslations), '');
  });
});
