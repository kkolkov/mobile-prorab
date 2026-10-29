import test from 'node:test';
import assert from 'node:assert/strict';
import {timeSummary} from '../src/core/time-summary.ts';
import type {Estimate} from '../src/core/types.ts';
test('Time summary combines finishing and assembly and adds drying exactly once',()=>{
 const estimate={timePlan:{totalDays:30,phases:[{id:'rough',durationDays:10},{id:'drying',title:'Сушка',durationDays:8},{id:'finishing',durationDays:8},{id:'assembly',durationDays:4}],workloads:[]}} as unknown as Estimate;
 const s=timeSummary(estimate)!;
 assert.deepEqual(s.groups.map(g=>g.days),[10,12]);assert.equal(s.total,30);assert.equal(s.consistent,true);
 assert.equal(s.pauses[0].days,8);assert.equal(timeSummary(null),null);
});
