import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDays,durationRange,projectsSubtitle,projectAppearance,projectCardDetails} from '../src/core/display.ts';
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

test('Project card colors follow lifecycle including started zero and completed schedules',()=>{
 assert.deepEqual(projectAppearance({status:'draft'}),{tone:'neutral',label:'Черновик'});
 assert.deepEqual(projectAppearance({status:'active',executionProgressPercent:null}),{tone:'lavender',label:'Планирование'});
 for(const percent of [0,25,99])assert.deepEqual(projectAppearance({status:'active',executionProgressPercent:percent}),{tone:'sand',label:'Ремонт идёт'});
 assert.deepEqual(projectAppearance({status:'active',executionProgressPercent:100}),{tone:'sage',label:'Все этапы завершены'});
 assert.equal(projectAppearance({status:'completed'}).tone,'sage');
 assert.equal(projectAppearance({status:'draft',executionProgressPercent:0}).tone,'neutral');
});

test('Project card shows saved budget and distinct draft versus repair progress',()=>{
 const draft=projectCardDetails({status:'draft',completedStep:2});
 assert.equal(draft.budget,'Смета ещё не рассчитана');
 assert.deepEqual(draft.progress,{label:'Шаг 3 из 5',percent:40,aria:'Заполнение проекта'});
 assert.equal(projectCardDetails({status:'draft',completedStep:5}).progress?.percent,100);
 assert.equal(projectCardDetails({status:'draft',completedStep:5}).progress?.label,'Все 5 шагов заполнены');
 assert.equal(projectCardDetails({status:'active'}).progress,null);
 const active=projectCardDetails({status:'active',budgetMinRub:100,budgetMaxRub:200,executionProgressPercent:0,updatedAt:'2026-10-27T12:00:00Z'});
 assert.equal(active.budget,'100 — 200 ₽');assert.equal(active.progress?.percent,0);assert.equal(active.updated,'Изменён 27.10.2026');
 assert.equal(projectCardDetails({status:'active',updatedAt:'invalid'}).updated,null);
});
