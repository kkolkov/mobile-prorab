import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDraft,fieldValid,esc,select,apartmentForm,roomForm} from '../js/refinement/forms.js';
test('refinement accepts decimal comma, preserves explicit refusals and unknown values',()=>{
 const d=parseDraft({areaM2:'75,5',ceilingHeight:'2,75',balcony:{areaM2:''},lighting:false,stove:null,oven:false});
 assert.deepEqual(d,{areaM2:75.5,ceilingHeight:2.75,balcony:{areaM2:null},lighting:false,stove:null,oven:false});
});
test('refinement validates decimal precision and ceiling bounds without erasing input',()=>{
 for(const [raw,valid] of [['2,7',true],['2,75',false],['2',true],['5',true],['1.99',false],['5.1',true],['5.01',false],['10',true],['10.01',false],['2.755',false],['abc',false],['',true]]){
  const el={value:raw,dataset:{number:'1',min:'2',max:'10'},required:false,setCustomValidity(m){this.message=m},setAttribute(){}};
  assert.equal(fieldValid(el),valid,raw);assert.equal(el.value,raw);
 }
});
test('refinement renders user text escaped',()=>assert.equal(esc('<img src="x">'),'&lt;img src=&quot;x&quot;&gt;'));

test('Target result hides furnished choice but preserves a legacy selected value',()=>{
 for(const value of ['finish_only','fully_furnished']){
  const html=select('targetState','Результат',value);
  assert.match(html,/<option value="fully_furnished"[^>]*disabled hidden>/);
  assert.match(html,/<option value="move_in_ready"[^>]*>Готовая к проживанию/);
  if(value==='fully_furnished')assert.match(html,/<option value="fully_furnished" selected disabled hidden>/);
 }
});

test('Apartment labels and ceiling range match the requested form',()=>{
 const html=apartmentForm({});
 for(const text of ['Текущее состояние квартиры','Желаемый результат ремонта','По умолчанию: 2,7 м','data-max="10"','data-number="1"','От 2 до 10 м, не более одного знака после запятой.'])assert.ok(html.includes(text),text);
});

test('Apartment redevelopment precedes finishing and informers do not submit the form',()=>{
 for(const redevelopment of [true,false]){
  const html=apartmentForm({redevelopment});
  assert.ok(html.indexOf('f-redevelopment')<html.indexOf('Общая отделка'));
  assert.ok(html.includes(`value="${redevelopment}" selected`));
  assert.ok(!html.includes('Индивидуальная отделка имеет приоритет'));
  assert.ok(html.includes('Если параметр не выбран, калькулятор автоматически закладывает базовый вариант'));
  assert.ok(html.includes('Электрика рассчитывается по базовым нормам (розетки, кабель).'));
  assert.equal((html.match(/data-info-open=/g)||[]).length,2);
  assert.ok(!/<button(?![^>]*type="button")/.test(html));
 }
});

test('Bathroom walls rename only the first inherited option to tile',()=>{
 for(const type of ['combined_bathroom','bathroom','toilet']){
  const html=roomForm({type,walls:'inherit',floor:'inherit',ceiling:'inherit'});
  const walls=html.match(/<select id="f-walls"[^>]*>(.*?)<\/select>/)[1];
  assert.match(walls,/^<option value="inherit" selected[^>]*>Плитка<\/option>/);
  assert.ok(!html.includes('Норматив санузла'));
 }
});

test('Bathroom floor has one tile option first and preserves existing explicit tile selection',()=>{
 for(const type of ['combined_bathroom','bathroom','toilet'])for(const floor of ['inherit','tile','laminate']){
  const html=roomForm({type,floor});
  const options=html.match(/<select id="f-floor"[^>]*>(.*?)<\/select>/)[1];
  assert.equal((options.match(/>Плитка</g)||[]).length,1);
  assert.match(options,/^<option[^>]*>Плитка<\/option>/);
  assert.deepEqual([...options.matchAll(/>([^<]+)<\/option>/g)].map(m=>m[1]),['Плитка','Пока не определено','Ламинат','Кварцвинил','Паркетная доска']);
  assert.ok(options.includes(`value="${floor}" selected`));
 }
});

test('Bathroom ceiling has one stretch option first and preserves saved selection',()=>{
 for(const type of ['combined_bathroom','bathroom','toilet'])for(const ceiling of ['inherit','stretch','paint']){
  const html=roomForm({type,ceiling});
  const options=html.match(/<select id="f-ceiling"[^>]*>(.*?)<\/select>/)[1];
  assert.equal((options.match(/>Натяжной</g)||[]).length,1);
  assert.deepEqual([...options.matchAll(/>([^<]+)<\/option>/g)].map(m=>m[1]),['Натяжной','Пока не определено','Покраска','Гипсокартон']);
  assert.ok(options.includes(`value="${ceiling}" selected`));
 }
});
