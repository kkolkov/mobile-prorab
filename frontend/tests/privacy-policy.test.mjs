import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {privacyPolicy} from '../js/auth/privacy-policy.js';
test('Privacy policy is identical in web and Expo and identifies operator, contact and OCR',()=>{
 const mobile=JSON.parse(readFileSync(new URL('../../mobile/src/auth/privacy-policy.json',import.meta.url),'utf8'));
 assert.deepEqual(privacyPolicy,mobile);
 const text=privacyPolicy.map(s=>s.title+' '+s.text).join(' ');
 for(const required of ['Тюрина Полина Петровна','245513177275','mobile.prorab.app@gmail.com','OCR.space','Render','удаления','30 дней'])assert.ok(text.includes(required));
 assert.ok(!/lorem ipsum/i.test(text));
 assert.ok(!text.includes('ООО'));
 assert.ok(!text.includes('исключительно с использованием баз данных, находящихся на территории Российской Федерации'));
 assert.ok(text.includes('Frankfurt'));
 assert.ok(text.includes('само по себе не является согласием'));
});
