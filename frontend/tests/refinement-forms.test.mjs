import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDraft,fieldValid,esc} from '../js/refinement/forms.js';
test('refinement accepts decimal comma, preserves explicit refusals and unknown values',()=>{
 const d=parseDraft({areaM2:'75,5',ceilingHeight:'2,75',balcony:{areaM2:''},lighting:false,stove:null,oven:false});
 assert.deepEqual(d,{areaM2:75.5,ceilingHeight:2.75,balcony:{areaM2:null},lighting:false,stove:null,oven:false});
});
test('refinement validates decimal precision and ceiling bounds without erasing input',()=>{
 for(const [raw,valid] of [['2,75',true],['2',true],['5',true],['1.99',false],['5.01',false],['2.755',false],['abc',false],['',true]]){
  const el={value:raw,dataset:{number:'2',min:'2',max:'5'},required:false,setCustomValidity(m){this.message=m},setAttribute(){}};
  assert.equal(fieldValid(el),valid,raw);assert.equal(el.value,raw);
 }
});
test('refinement renders user text escaped',()=>assert.equal(esc('<img src="x">'),'&lt;img src=&quot;x&quot;&gt;'));
