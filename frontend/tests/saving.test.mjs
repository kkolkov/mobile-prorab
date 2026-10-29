import test from 'node:test';
import assert from 'node:assert/strict';

test('AC-05/06/07: loading ends on CP-02, choice is local and save failure is retryable', async () => {
  const elements = new Map(['#app','#area','#name','#primary','#back','#what'].map(id=>[id,{value:''}]));
  const card = {dataset:{key:'currentState',value:'old_finish'}};
  globalThis.window = {};
  globalThis.localStorage={getItem:()=> '00000000-0000-4000-8000-000000000001'};
  const accessElements=new Map(['#retry','#exit','#access-leave'].map(id=>[id,{}]));
  elements.get('#app').querySelector=s=>accessElements.get(s);
  globalThis.document = {querySelector:s=>elements.get(s),querySelectorAll:()=>[card]};
  const originalFetch = globalThis.fetch;
  let resolveRequest;
  let requests = 0;
  const bodies=[];
  globalThis.fetch = (url, options) => {bodies.push(JSON.parse(options.body));if(url.endsWith('/projects/access'))return Promise.resolve({ok:true,text:async()=>JSON.stringify({userGroup:'B',fullAccess:false,trialEligible:false,questionnaireRequired:false})});if(url.endsWith('/projects/access/offer'))return Promise.resolve({ok:true,text:async()=> '{}' });requests++;return new Promise(resolve=>{resolveRequest=resolve})};
  const respond = data => resolveRequest({ok:true,text:async()=>JSON.stringify(data)});
  try {
    (await import('../js/app.js')).render();
    const area = elements.get('#area'); area.value='68'; area.oninput();
    const saving = elements.get('#primary').onclick();
    assert.equal(Object.hasOwn(bodies[0],'address'),false);
    assert.match(elements.get('#app').innerHTML,/id="primary" disabled>Сохранение/);
    respond({projectId:'draft',version:0,areaM2:68,nameSource:'auto',completedStep:1});
    await saving;
    assert.match(elements.get('#app').innerHTML,/Текущее состояние квартиры/);
    assert.match(elements.get('#app').innerHTML,/id="primary" disabled>Продолжить/);
    assert.doesNotMatch(elements.get('#app').innerHTML,/Сохранение/);
    card.onclick();
    assert.equal(requests,1);
    const failedSave = elements.get('#primary').onclick();
    resolveRequest({ok:false,text:async()=>JSON.stringify({message:'Не удалось сохранить данные'})});
    await failedSave;
    assert.match(elements.get('#app').innerHTML,/Не удалось сохранить данные/);
    assert.match(elements.get('#app').innerHTML,/card selected/);
    assert.doesNotMatch(elements.get('#app').innerHTML,/Сохранение/);
    const retry = elements.get('#primary').onclick();
    respond({projectId:'draft',version:1,currentState:'old_finish',completedStep:2});
    await retry;
    assert.match(elements.get('#app').innerHTML,/Желаемый результат ремонта/);
    assert.doesNotMatch(elements.get('#app').innerHTML,/Сохранение/);
  } finally {globalThis.fetch=originalFetch;delete globalThis.window;delete globalThis.document;delete globalThis.localStorage}
});
