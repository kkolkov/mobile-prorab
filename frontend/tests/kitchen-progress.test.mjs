import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPendingKitchens} from '../js/refinement/kitchen-progress.js';
const defaults={cabinets:'unknown',facade:'unknown',countertop:'unknown',lengthM:null,stove:null,oven:null,refrigerator:null,hood:null,dishwasher:null};
test('Multiple kitchens remain incomplete until each is confirmed, including unchanged defaults',()=>{
 const data={rooms:[{id:'a',type:'kitchen'},{id:'b',type:'kitchen'}],kitchens:{a:{...defaults},b:{...defaults}},completedSections:[]};
 assert.equal(hasPendingKitchens(data),false);
 data.completedSections=['kitchen'];data.kitchens.a.parametersConfirmed=true;
 assert.equal(hasPendingKitchens(data),true);assert.equal(hasPendingKitchens(JSON.parse(JSON.stringify(data))),true);
 data.kitchens.b.parametersConfirmed=true;assert.equal(hasPendingKitchens(data),false);
 data.rooms.push({id:'c',type:'kitchen'});data.kitchens.c={...defaults};assert.equal(hasPendingKitchens(data),true);
 data.rooms.pop();assert.equal(hasPendingKitchens(data),false);
});
test('Legacy edited kitchens count as specified; untouched siblings remain pending',()=>{
 const data={rooms:[{id:'a',type:'kitchen'},{id:'b',type:'kitchen'}],kitchens:{a:{...defaults,cabinets:'keep'},b:{...defaults}},completedSections:['kitchen']};
 assert.equal(hasPendingKitchens(data),true);data.kitchens.b.oven=false;assert.equal(hasPendingKitchens(data),false);
});
