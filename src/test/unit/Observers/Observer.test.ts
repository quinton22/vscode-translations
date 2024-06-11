/* eslint-disable @typescript-eslint/naming-convention */

import assert = require('assert');
import { Observer } from '../../../Observers';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';

suite('Observer Test Suite', () => {
  test('Should get the value of next when subscribed', () => {
    const o = new Observer<string>();

    let i = 0;
    const values = ['first', 'second'];

    o.subscribe((v) => assert.equal(v, values[i]));

    for (; i < 2; ++i) {
      // @ts-ignore
      o.next(values[i]);
    }
  });

  test('if subscribed after should not return anything until next is called again', () => {
    const o = new Observer<string>();

    // @ts-ignore
    o.next('first');

    o.subscribe((v) => assert.equal(v, 'second'));

    // @ts-ignore
    o.next('first');
  });

  test('Should remove all subscriptions when removeAllSubscriptions is called', () => {});
  test('Should remove only current subscription when', () => {});

  //   test('Should output in expected format', () => {
  //     assert.strictEqual(
  //       hoverRenderer(mockTranslations).value,
  //       `| Namespace\u00a0\u00a0\u200b | Language\u00a0\u00a0\u200b | Text\u00a0\u00a0\u200b |
  // |:---|:---|:---|
  // | translation | en-US | hello |
  // |   | es-ES | hola |
  // | other | en-US | hi |
  // |   | es-ES | hola |`
  //     );
  //   });
});
