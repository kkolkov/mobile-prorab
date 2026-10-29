import test from 'node:test';
import assert from 'node:assert/strict';
import {roomName} from '../src/refinement/room-name.ts';
import type {Room} from '../src/core/types.ts';
test('Cleared room name uses current saved type order, not suffixes or deleted rooms',()=>{
 const rooms=[{id:'first',type:'combined_bathroom',name:'Санузел 1'},{id:'second',type:'combined_bathroom',name:'Мой санузел 99'}] as Room[];
 const labels={combined_bathroom:'Совмещённый санузел'};
 assert.equal(roomName({...rooms[0],name:''},rooms,labels),'Совмещённый санузел 1');
 assert.equal(roomName({...rooms[1],name:''},rooms,labels),'Совмещённый санузел 2');
 const remaining=JSON.parse(JSON.stringify(rooms.slice(1))) as Room[];
 assert.equal(roomName({...remaining[0],name:''},remaining,labels),'Совмещённый санузел 1');
 assert.equal(roomName({...remaining[0],id:'new',name:''},remaining,labels),'Совмещённый санузел 2');
 assert.equal(roomName({...remaining[0],name:'Мой санузел'},remaining,labels),'Мой санузел');
 assert.equal(remaining[0].id,'second');
});
