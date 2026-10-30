import test from 'node:test';
import assert from 'node:assert/strict';
import { apiBase, autoName, emptyRoom, numberError, parseNumbers, resumeStep, updateNameArea, validArea } from '../src/core/rules.ts';
import { ApiError, createRequest } from '../src/core/http.ts';
import type { Project, Room } from '../src/core/types.ts';

test('AC-01/02: area accepts comma and one decimal, rejects empty/zero/negative/extra precision',()=>{
  for(const value of ['',null,'0','-3','abc','3.22','4.9','10000','5.01'])assert.equal(validArea(value),false,String(value));
  for(const value of ['5','9999','33','68,5','68.5'])assert.equal(validArea(value),true);
  assert.equal(autoName('68,5'),'Ремонт квартиры 68.5 м²');
  for(const value of ['1.9','10.1','2,75'])assert.ok(numberError(value,false,1,2,10));for(const value of ['2','2,7','10'])assert.equal(numberError(value,false,1,2,10),'');
});
test('AC-03 amended: custom wording survives, only area suffix changes',()=>{
  assert.equal(updateNameArea('Ремонт МОЕЙ квартиры 33 м²','38'),'Ремонт МОЕЙ квартиры 38 м²');
  assert.equal(updateNameArea('Моя квартира','38'),'Моя квартира');
  assert.equal(updateNameArea('Квартира 33 м²',''),'Квартира 33 м²');
});
test('Refinement: conversion keeps normative null, explicit refusal false, and empty measurements',()=>{
  assert.deepEqual(parseNumbers({areaM2:'68,5',balcony:{areaM2:''},oven:false,stove:null,ceilingHeight:'2,75'}),
    {areaM2:68.5,balcony:{areaM2:null},oven:false,stove:null,ceilingHeight:2.75});
});
test('AC-16: resume the first unfinished step, fully completed draft resumes estimate',()=>{
  assert.equal(resumeStep({completedStep:2} as Project),3);
  assert.equal(resumeStep({completedStep:5} as Project),6);
});
test('Only untouched automatic rooms may be removed automatically',()=>{
  const r={automatic:true,areaM2:null,floor:'inherit',walls:'inherit',ceiling:'inherit'} as Room;
  assert.equal(emptyRoom(r),true);assert.equal(emptyRoom({...r,areaM2:20}),false);
  assert.equal(emptyRoom({...r,automatic:false}),false);assert.equal(emptyRoom({...r,walls:'paint'}),false);
});
test('iPhone backend uses Metro host, with explicit URL override',()=>{
  assert.equal(apiBase(undefined,undefined),'https://mobile-prorab.onrender.com/api');
  assert.equal(apiBase(undefined,'192.168.1.9:8081'),'http://192.168.1.9:8081/prorab-api');
  assert.equal(apiBase(undefined,'http://192.168.1.9:8081'),'http://192.168.1.9:8081/prorab-api');
  assert.equal(apiBase(undefined,'random-name-8081.exp.direct'),'https://random-name-8081.exp.direct/prorab-api');
  assert.equal(apiBase('https://example.test/api/','192.168.1.9:8081'),'https://example.test/api');
});
test('API conflict exposes 409 and sends versioned payload without silently retrying',async()=>{
  let calls=0;
  const request=createRequest('http://server/api',async(url,options)=>{
    calls++;assert.equal(url,'http://server/api/projects/id/steps/2');assert.equal(options?.method,'PUT');
    assert.equal(options?.body,'{"version":4,"currentState":"old_finish"}');
    return new Response('{"message":"Конфликт"}',{status:409});
  });
  await assert.rejects(request('/projects/id/steps/2',{version:4,currentState:'old_finish'},'PUT'),e=>e instanceof ApiError&&e.status===409);
  assert.equal(calls,1);
});
test('API network failure and timeout are recoverable, never automatically repeat a mutation',async()=>{
  const failing=createRequest('',async()=>{throw new TypeError('Network failed');});
  await assert.rejects(failing('/draft',{areaM2:33}),/Ваш ввод остался/);
  const timeout=createRequest('',async(_url,options)=>new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new Error('timeout')))),5);
  await assert.rejects(timeout('/draft',{areaM2:33}),e=>e instanceof ApiError&&e.status===0&&/Сервер не ответил/.test(e.message));
});

test('Slow server response remains successful and login is sent only once',async()=>{
 let calls=0;
 const request=createRequest('https://server/api',async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return new Response('{"ok":true}');},100);
 assert.deepEqual(await request('/auth/login',{login:'example',password:'example-password'}),{ok:true});
 assert.equal(calls,1);
});
