import test from 'node:test';
import assert from 'node:assert/strict';
import {answersComplete,emptyAnswers,questions} from '../js/onboarding/questions.js';
import {questionnaireHtml,bindQuestionnaire} from '../js/onboarding/form.js';

test('Onboarding: exactly three required questions, false is a valid first-renovation answer',()=>{
  assert.equal(questions.length,3);
  assert.equal(answersComplete(emptyAnswers()),false);
  for(const firstRenovation of [true,false])for(const renovationManager of ['self','turnkey_team','designer_or_management'])for(const renovationStage of ['planning','in_progress','completed']) {
    const answers={firstRenovation,renovationManager,renovationStage};
    assert.equal(answersComplete(answers),true);
    for(const key of Object.keys(answers))assert.equal(answersComplete({...answers,[key]:null}),false);
  }
  assert.equal(answersComplete({firstRenovation:false,renovationManager:'unknown',renovationStage:'planning'}),false);
});
test('Onboarding: incomplete and busy forms cannot continue; original selected answers remain visible',()=>{
  assert.match(questionnaireHtml(emptyAnswers()),/type="submit" disabled/);
  const answers={firstRenovation:false,renovationManager:'self',renovationStage:'planning'};
  const html=questionnaireHtml(answers,true);
  assert.equal((html.match(/<fieldset/g)||[]).length,3);
  assert.equal((html.match(/type="radio"/g)||[]).length,8);
  assert.equal((html.match(/checked disabled/g)||[]).length,3);
  assert.match(html,/type="submit" disabled/);
  assert.doesNotMatch(questionnaireHtml(answers),/type="submit" disabled/);
});
test('Onboarding: selecting and going back do not submit; an error does not clear input',()=>{
  const answers={firstRenovation:false,renovationManager:'self',renovationStage:'planning'};
  const nodes={'#onboarding-error':{},'#onboarding-back':{},'#onboarding-form':{}};
  const input={name:'renovationManager',value:'1'};
  const root={querySelector:key=>nodes[key],querySelectorAll:()=>[input]};
  let submitted=0,back=0,changed;
  bindQuestionnaire(root,{answers,onChange:value=>changed=value,onContinue:()=>submitted++,onBack:()=>back++,error:'Сеть недоступна'});
  input.onchange();assert.equal(submitted,0);assert.equal(changed.renovationManager,'turnkey_team');
  nodes['#onboarding-back'].onclick();assert.equal(back,1);assert.equal(submitted,0);
  assert.equal(answers.firstRenovation,false);assert.equal(nodes['#onboarding-error'].textContent,'Сеть недоступна');
  nodes['#onboarding-form'].onsubmit({preventDefault(){}});assert.equal(submitted,1);
  bindQuestionnaire(root,{answers,onChange(){},onContinue:()=>submitted++,onBack(){},busy:true});
  nodes['#onboarding-form'].onsubmit({preventDefault(){}});assert.equal(submitted,1);
});
