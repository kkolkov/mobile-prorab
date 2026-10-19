import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDays,durationRange,projectsSubtitle} from '../src/core/display.ts';
test('Estimated duration uses 30-day months and omits zero remainder',()=>{
 for(const [days,label] of [[0,'0 дн.'],[15,'15 дн.'],[29,'29 дн.'],[30,'1 мес.'],[31,'1 мес. 1 дн.'],[120,'4 мес.'],[165,'5 мес. 15 дн.']] as const)assert.equal(formatDays(days),label);
 assert.equal(durationRange(120,165),'4 мес. — 5 мес. 15 дн.');
 assert.equal(durationRange(15,45),'15 дн. — 1 мес. 15 дн.');
 assert.equal(durationRange(null,165),'Пока не рассчитан');
 assert.equal(durationRange(120,null),'Пока не рассчитан');
});
test('Home invites continuing only when a draft or active project exists',()=>{
 assert.equal(projectsSubtitle([]),'Создайте новый проект.');
 assert.equal(projectsSubtitle([{status:'completed'}]),'Создайте новый проект.');
 for(const status of ['draft','active'])assert.equal(projectsSubtitle([{status}]),'Продолжите ремонт или создайте новый проект.');
});
