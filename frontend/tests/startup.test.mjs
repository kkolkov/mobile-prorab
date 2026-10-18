import test from 'node:test';
import assert from 'node:assert/strict';

test('CP-01 starts; AC-01/02 area controls Continue; AC-03 preserves custom name', async () => {
  const elements = new Map(['#app', '#address', '#area', '#name', '#primary'].map(id => [id, {value: ''}]));
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.window = {};
  globalThis.document = {querySelector: selector => elements.get(selector)};
  globalThis.fetch = () => { requests++; throw new Error('No request expected before Continue'); };
  try {
    (await import('../js/app.js')).render();
    const html = elements.get('#app').innerHTML;
    assert.match(html, /Об объекте/);
    assert.match(html, /Шаг 1 из 5/);
    assert.match(html, /id="primary" disabled/);

    const area = elements.get('#area');
    area.value = '68';
    area.oninput();
    assert.equal(elements.get('#primary').disabled, false);
    assert.equal(elements.get('#name').value, 'Ремонт квартиры 68 м²');

    area.value = '72';
    area.oninput();
    const name = elements.get('#name');
    assert.equal(name.value, 'Ремонт квартиры 72 м²');

    name.value = 'Моя квартира';
    name.oninput();
    area.value = '80';
    area.oninput();
    assert.equal(name.value, 'Моя квартира');

    name.value = 'Моя квартира 80 м²';
    name.oninput();
    area.value = '90';
    area.oninput();
    assert.equal(name.value, 'Моя квартира 90 м²');

    for (const invalidArea of ['', ' ', '0', '-1']) {
      area.value = invalidArea;
      area.oninput();
      assert.equal(elements.get('#primary').disabled, true);
    }
    assert.equal(requests, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});
