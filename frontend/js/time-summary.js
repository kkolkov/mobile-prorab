const roughEngineering=new Set(['L_cable','L_chase_other','L_chase_fill','L_box_other','L_backbox','L_pipe_water','L_water_points','L_sewer','L_sewer_points']);
const legacy=new Set(['floor','wall','ceiling','preparation','demolition','electrical','plumbing','joinery','equipment','glazing']);
export const timeNumber=value=>Number(value).toLocaleString('ru-RU',{maximumFractionDigits:2});
export function timeSummary(estimate){
 const plan=estimate?.timePlan;if(!plan)return null;
 const groups=[{id:'rough',title:'Этап 1. Черновые работы',days:0,rows:[]},{id:'finishing',title:'Этап 2. Чистовые работы',days:0,rows:[]}];
 const pauses=[];
 for(const phase of plan.phases){
  if(phase.id==='rough')groups[0].days+=phase.durationDays;
  else if(phase.id==='finishing'||phase.id==='assembly')groups[1].days+=phase.durationDays;
  else pauses.push({title:phase.title,days:phase.durationDays});
 }
 for(const w of plan.workloads??[]){
  const group=groups[(w.phase==='rough'||['plaster_wall','plaster_ceiling','plaster_slope','screed','screed_semi','waterproof'].includes(w.code))?0:1];
  const title=['tile_floor','tile_wall'].includes(w.code)?'Укладка плитки (пол и стены)':w.title;
  const existing=group.rows.find(r=>r.title===title&&r.hours!==null);
  if(existing){existing.quantity+=w.quantityM2;existing.hours+=w.personHours;existing.workDays=existing.hours/16;}
  else group.rows.push({title,quantity:w.quantityM2,unit:'м²',hours:w.personHours,workDays:w.personHours/16});
 }
 const unknown=new Set();
 const addUnknown=(index,title)=>{const key=index+title;if(unknown.has(key))return;unknown.add(key);groups[index].rows.push({title,quantity:null,unit:'',hours:null,workDays:null});};
 for(const line of estimate.details?.lines??[]){
  const code=line.priceCode??'',id=code.replace(/^ref\./,'');
  if(!(code.startsWith('ref.L_')||legacy.has(code)||code.startsWith('spb.glazing.')||code.startsWith('spb.insulation.')||code==='spb.kitchen.assembly'))continue;
  if(roughEngineering.has(id)||['electrical','plumbing'].includes(code))addUnknown(0,'Электрика и сантехника (разводка)');
  else if(code.startsWith('ref.L_demo_')||['demolition','preparation'].includes(code))addUnknown(0,'Демонтаж и подготовка');
  else if(code.startsWith('spb.glazing.')||code.startsWith('spb.insulation.'))addUnknown(0,'Остекление и утепление');
  else if(code.startsWith('ref.L_door_')||code.startsWith('ref.L_stretch_')||code==='ref.L_gkl'||code==='ceiling')addUnknown(1,'Монтаж дверей и потолков');
  else if(['ref.L_spc','ref.L_decor','floor','wall'].includes(code))addUnknown(1,'Другие чистовые работы');
  else addUnknown(1,'Монтаж оборудования и уборка');
 }
 if(plan.phases.some(p=>p.id==='assembly'))addUnknown(1,'Монтаж оборудования и уборка');
 const total=groups.reduce((s,g)=>s+g.days,0)+pauses.reduce((s,p)=>s+p.days,0);
 const max=estimate.durationMaxDays>=total?estimate.durationMaxDays:total;
 const drying=plan.phases.filter(p=>p.id==='drying').reduce((s,p)=>s+p.durationDays,0);
 return {groups,pauses,total,max,consistent:total===plan.totalDays,explanation:`Расчёт использует нормативы ГЭСН из справочника и ориентирован на бригаду из 2 человек. ${drying?'Включает технологические паузы на высыхание ('+drying+' дн.).':'Технологические паузы на высыхание в этом расчёте не добавлены.'} Итоговый срок зависит от выбранных материалов и загруженности бригады.`};
}
