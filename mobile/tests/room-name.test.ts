import test from 'node:test';
import assert from 'node:assert/strict';
import {roomName} from '../src/refinement/room-name.ts';
import type {Room} from '../src/core/types.ts';
test('Blank bathroom names follow list order rather than names or hidden counters',()=>{
 const first={id:'1',type:'combined_bathroom',name:'Санузел 1'} as Room;
 const second={id:'2',type:'combined_bathroom',name:'Совмещённый санузел 9'} as Room;
 const labels={combined_bathroom:'Совмещённый санузел'};
 assert.equal(roomName({...first,name:''},[first,second],labels),'Совмещённый санузел 1');
 assert.equal(roomName({...second,name:''},[first,second],labels),'Совмещённый санузел 2');
 assert.equal(roomName({...second,name:''},[second],labels),'Совмещённый санузел 1');
 assert.equal(roomName({...first,name:'Гостевой'},[first,second],labels),'Гостевой');
});
