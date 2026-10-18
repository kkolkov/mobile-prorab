import test from 'node:test';
import assert from 'node:assert/strict';
import {updateNameArea} from '../js/project-name.js';
import {localName} from '../js/state.js';

test('AC-03 amended: only trailing area changes; custom wording stays intact', () => {
  assert.equal(updateNameArea('Ремонт МОЕЙ квартиры 33 м²', '38'), 'Ремонт МОЕЙ квартиры 38 м²');
  assert.equal(updateNameArea('Квартира 33', '38'), 'Квартира 33');
  assert.equal(updateNameArea('33 м² — моя квартира', '38'), '33 м² — моя квартира');
  assert.equal(updateNameArea('Квартира 7: 33,5 м²', '38,5'), 'Квартира 7: 38.5 м²');
  for (const area of ['', '0', '-1', 'abc']) {
    assert.equal(updateNameArea('Моя квартира 33 м²', area), 'Моя квартира 33 м²');
  }
  assert.equal(localName('38,5'), 'Ремонт квартиры 38.5 м²');
});
