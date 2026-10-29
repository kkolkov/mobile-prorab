const roughCodes=new Set(['plaster_wall','plaster_ceiling','plaster_slope','screed','screed_semi','waterproof']);
const roughEngineering=new Set(['L_cable','L_chase_other','L_chase_fill','L_box_other','L_backbox','L_pipe_water','L_water_points','L_sewer','L_sewer_points']);
const legacy=new Set(['floor','wall','ceiling','preparation','demolition','electrical','plumbing','joinery','equipment','glazing']);
export const timeExplanation='Расчёт ориентирован на бригаду из двух человек по 8 часов. Общий срок включает рассчитанные технологические паузы на высыхание и зависит от материалов и загрузки бригады.';
export function timeSummary(estimate){
 const plan=estimate?.timePlan;
 if(!plan)return null;
 const groups=[{id:'rough',title:'Этап 1 — Черновые работы',days:0,rows:[]},{id:'finishing',title:'Этап 2 — Чистовые работы',days:0,rows:[]}];
 const pauses=[];
 for(const phase of plan.phases){
  if(phase.id==='rough')groups[0].days+=phase.durationDays;
  else if(phase.id==='finishing'||phase.id==='assembly')groups[1].days+=phase.durationDays;
  else pauses.push({title:phase.title,days:phase.durationDays});
 }
 for(const w of plan.workloads??[]){
  const group=groups[(w.phase==='rough'||roughCodes.has(w.code))?0:1];
  group.rows.push({title:w.title,quantity:w.quantityM2,unit:'м²',norm:w.personHoursPer100m2,hours:w.personHours,workDays:w.personHours/16});
 }
 const unknown=new Map();
 for(const line of estimate.details?.lines??[]){
  const code=line.priceCode??'';
  if(!(code.startsWith('ref.L_')||legacy.has(code)||code.startsWith('spb.glazing.')||code.startsWith('spb.insulation.')||code==='spb.kitchen.assembly'))continue;
  const rough=code.startsWith('ref.L_demo_')||roughEngineering.has(code.replace(/^ref\./,''))||['preparation','demolition','electrical','plumbing'].includes(code)||code.startsWith('spb.glazing.')||code.startsWith('spb.insulation.');
  const key=code+'|'+line.unit;
  const previous=unknown.get(key);
  if(previous)previous.row.quantity+=line.quantity;
  else unknown.set(key,{index:rough?0:1,row:{title:line.name.replace(/^.*?:\s*/,''),quantity:line.quantity,unit:line.unit,norm:null,hours:null,workDays:null}});
 }
 for(const entry of unknown.values())groups[entry.index].rows.push(entry.row);
 const total=groups.reduce((s,g)=>s+g.days,0)+pauses.reduce((s,p)=>s+p.days,0);
 return {groups,pauses,total,consistent:total===plan.totalDays};
}
export const timeNumber=value=>Number(value).toLocaleString('ru-RU',{maximumFractionDigits:2});
