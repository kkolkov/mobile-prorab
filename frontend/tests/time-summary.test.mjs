import test from 'node:test';
import assert from 'node:assert/strict';
import {timeSummary} from '../js/time-summary.js';
import {estimateTime} from '../js/estimate-details.js';
const example=()=>({durationMaxDays:36,timePlan:{totalDays:30,phases:[{id:'rough',durationDays:10},{id:'drying',title:'Технологическая пауза',durationDays:8},{id:'finishing',durationDays:8},{id:'assembly',durationDays:4}],workloads:[{code:'plaster_wall',title:'Штукатурка стен',phase:'rough',quantityM2:130,personHours:96},{code:'tile_wall',title:'Плитка стен',phase:'finishing',quantityM2:20,personHours:24},{code:'tile_floor',title:'Плитка пола',phase:'finishing',quantityM2:7,personHours:8}]},details:{lines:[{priceCode:'ref.L_cable',name:'Комната: кабель',quantity:20,unit:'м'},{priceCode:'ref.L_pipe_water',name:'Кухня: вода',quantity:10,unit:'м'},{priceCode:'ref.L_door_ordinary',name:'Дверь',quantity:1,unit:'шт.'}]}});
test('User time summary combines phases and tile workloads; unsupported durations are not invented',()=>{
 const s=timeSummary(example());assert.equal(s.total,30);assert.equal(s.max,36);assert.equal(s.consistent,true);
 assert.deepEqual(s.groups.map(g=>g.days),[10,12]);
 assert.equal(s.groups[0].rows[0].workDays,6);
 const tile=s.groups[1].rows.find(r=>r.title==='Укладка плитки (пол и стены)');assert.equal(tile.quantity,27);assert.equal(tile.hours,32);assert.equal(tile.workDays,2);
 const engineering=s.groups[0].rows.filter(r=>r.title==='Электрика и сантехника (разводка)');assert.equal(engineering.length,1);assert.equal(engineering[0].hours,null);assert.equal(engineering[0].workDays,null);
 const html=estimateTime(example());assert.ok(html.includes('~30–36 дн.'));assert.ok(html.includes('8 дн.'));assert.ok(!html.includes('<td>—</td>'));assert.ok(html.includes('отдельный норматив не задан'));
});
test('Time summary handles missing data, missing drying and inconsistent saved totals',()=>{
 assert.equal(timeSummary(null),null);assert.ok(estimateTime(null).includes('пока не рассчитаны'));
 const e=example();e.timePlan.phases=e.timePlan.phases.filter(p=>p.id!=='drying');e.timePlan.totalDays=22;
 assert.equal(timeSummary(e).total,22);assert.ok(timeSummary(e).explanation.includes('не добавлены'));assert.ok(!timeSummary(e).explanation.includes('8 дн.'));
 e.timePlan.totalDays=27;assert.equal(timeSummary(e).consistent,false);assert.ok(estimateTime(e).includes('Пересчитайте оценку'));
});
