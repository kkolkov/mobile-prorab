import test from 'node:test';
import assert from 'node:assert/strict';
import {timeSummary} from '../js/time-summary.js';
import {estimateDetails} from '../js/estimate-details.js';
const estimate=()=>({timePlan:{totalDays:30,phases:[{id:'rough',durationDays:10},{id:'drying',title:'Технологическая пауза',durationDays:8},{id:'finishing',durationDays:8},{id:'assembly',durationDays:4}],workloads:[{code:'plaster_wall',title:'Штукатурка стен',phase:'rough',quantityM2:100,personHoursPer100m2:74,personHours:74},{code:'laminate',title:'Ламинат',phase:'finishing',quantityM2:20,personHoursPer100m2:22.55,personHours:4.51}]},assumptions:[],details:{roughMaterials:0,finishMaterials:0,labor:0,lines:[{priceCode:'ref.L_cable',name:'Комната: электрика',quantity:20,unit:'м'},{priceCode:'ref.L_cable',name:'Кухня: электрика',quantity:10,unit:'м'},{priceCode:'ref.L_door_ordinary',name:'Комната: монтаж двери',quantity:1,unit:'шт.'}]}});
test('Time summary groups saved phases, keeps pauses once and leaves unsupported work uncalculated',()=>{
 const s=timeSummary(estimate());
 assert.deepEqual(s.groups.map(g=>g.days),[10,12]);assert.equal(s.total,30);assert.equal(s.consistent,true);
 const electric=s.groups[0].rows.find(r=>r.title==='электрика');assert.equal(electric.quantity,30);assert.equal(electric.workDays,null);
 assert.equal(s.groups[1].rows.find(r=>r.title==='монтаж двери').norm,null);
 assert.equal(s.groups[0].rows[0].workDays,74/16);
 assert.equal(s.pauses.length,1);
 const html=estimateDetails(estimate());assert.ok(html.includes('Общий срок с паузами: 30'));assert.ok(html.includes('Отдельная норма и срок не рассчитаны'));assert.ok(!html.includes('<td>—</td>'));
});
test('Time summary handles missing details, no work and inconsistent legacy totals',()=>{
 assert.equal(timeSummary(null),null);
 assert.equal(timeSummary({timePlan:{totalDays:0,phases:[]}}).total,0);
 const e=estimate();e.timePlan.totalDays=31;
 assert.equal(timeSummary(e).consistent,false);
 assert.ok(estimateDetails(e).includes('сохранённый итог не совпадает'));
});
