import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/state.js';

test('AC-09: CP-04 selects No for server boolean false and keeps Yes/No mutually exclusive', async () => {
  const elements = new Map(['#app','#back','#primary'].map(id=>[id,{}]));
  const cards = ['true','false'].map(value=>({dataset:{key:'redevelopment',value}}));
  globalThis.window = {};
  globalThis.document = {querySelector:s=>elements.get(s),querySelectorAll:s=>s==='.card'?cards:[]};
  state.step=4;
  state.local={kitchensCount:1,bathroomsCount:1,redevelopment:false};
  try {
    (await import('../js/app.js')).render();
    const selected = value => {
      const html=elements.get('#app').innerHTML;
      assert.match(html,new RegExp('class="card selected" aria-pressed="true" data-key="redevelopment" data-value="'+value+'"'));
      assert.equal((html.match(/class="card selected"/g)||[]).length,1);
    };
    assert.match(elements.get('#app').innerHTML, /id="k">1</);
    assert.match(elements.get('#app').innerHTML, /id="b">1</);
    selected('false');
    cards[0].onclick();
    assert.equal(state.local.redevelopment,true);
    selected('true');
    cards[0].onclick();
    selected('true');
    cards[1].onclick();
    assert.equal(state.local.redevelopment,false);
    selected('false');
  } finally {delete globalThis.window;delete globalThis.document}
});
