import test from 'node:test';
import assert from 'node:assert/strict';
import {validArea} from '../js/validation.js';
import {roomName} from '../js/refinement/room-name.js';
test('Additional work: apartment area includes 5 and 9999, rejects out-of-range or excess precision',()=>{
 for(const v of ['5','5,1','9999'])assert.equal(validArea(v),true,v);
 for(const v of ['4.9','10000','5.01',''])assert.equal(validArea(v),false,v);
});
test('Additional work: blank room name uses next type ordinal, custom names remain intact',()=>{
 const kitchen={id:'new',type:'kitchen',name:''};const peers=[{id:'1',type:'kitchen',name:'Кухня 1'},{id:'2',type:'living',name:'Жилая комната 10'}];
 assert.equal(roomName(kitchen,peers,{kitchen:'Кухня'}),'Кухня 2');
 assert.equal(roomName(kitchen,[...peers,{id:'3',type:'kitchen',name:'Кухня 4'}],{kitchen:'Кухня'}),'Кухня 5');
 assert.equal(roomName({...kitchen,name:'Моя кухня'},peers,{kitchen:'Кухня'}),'Моя кухня');
});
