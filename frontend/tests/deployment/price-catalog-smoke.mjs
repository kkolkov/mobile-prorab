import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=(process.env.PRORAB_DEPLOY_URL||'http://127.0.0.1:8080').replace(/\/$/,'');
test('Price catalog release: live database, wizard, recalculation, finance and schedule', {timeout:180000},async()=>{
 let token,project;
 async function request(path,body,method=body===undefined?'GET':'POST'){
  const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(120000)});
  assert.ok(r.ok,`${path}: HTTP ${r.status}`);const raw=await r.text();return raw?JSON.parse(raw):null;
 }
 const catalog=await request('/porabadmin/prices');
 assert.ok(catalog.rows.some(r=>r.code==='average.material.laminate'));
 assert.equal(catalog.rows.filter(r=>r.code.startsWith('average.')).length,32);
 assert.equal(catalog.rows.some(r=>r.code.startsWith('city.')),false);
 const account=await request('/auth/register',{login:'prices_'+Date.now(),password:randomUUID(),privacyAccepted:true});token=account.token;
 try{
  project=await request('/projects/draft',{areaM2:64,name:'Проверка справочника цен'});
  const root='/projects/'+project.projectId;
  for(const [step,body] of [[2,{currentState:'old_finish'}],[3,{targetState:'move_in_ready'}],[4,{roomsCount:2,bathroomsCount:1,redevelopment:false}],[5,{finishLevel:'comfort'}]])
   project=await request(root+'/steps/'+step+(step===5?'/estimate':''),{version:project.version,...body},'PUT');
  assert.equal(project.estimateStatus,'ready');assert.ok(project.estimateDetails.timePlan.version.startsWith('phases-4-'));assert.ok(project.estimateDetails.timePlan.workloads.length>0);assert.equal(project.estimateDetails.algorithmVersion,'catalog-pricing-7');
  assert.equal(project.estimateDetails.total.expected,project.estimateDetails.details.lines.reduce((sum,l)=>sum+l.amountRub,0));
  assert.ok(project.estimateDetails.details.lines.some(l=>l.priceCode==='average.work.laminate'));
  project=await request(root+'/activate?version='+project.version,{});
  let ref=await request(root+'/refinement');assert.equal(Object.hasOwn(ref.data.apartment,'priceCity'),false);
  const saved=ref.activeEstimate;
  await request(root+'/refinement/calculate',{version:ref.project.version});
  for(let i=0;i<100;i++){
   ref=await request(root+'/refinement');if(ref.calculationStatus!=='pending')break;
   await new Promise(r=>setTimeout(r,100));
  }
  assert.equal(ref.calculationStatus,'ready');assert.deepEqual(ref.activeEstimate,saved);
  ref=await request(root+'/refinement/apply',{version:ref.project.version,estimateId:ref.candidateEstimate.id});
  let execution=await request(root+'/execution');
  assert.equal(execution.planBudget,ref.activeEstimate.total.expected);
  execution=await request(root+'/execution/start',{version:execution.version,date:new Date().toISOString().slice(0,10)});
  assert.ok(execution.data.tasks.some(t=>t.id==='rough'));assert.ok(execution.data.tasks.some(t=>t.id==='drying'));
  console.log(JSON.stringify({algorithm:ref.activeEstimate.algorithmVersion,rows:catalog.rows.length,budget:execution.planBudget,phases:execution.data.tasks.length}));
 }finally{
  if(project){const fresh=await request('/projects/'+project.projectId);await request('/projects/'+project.projectId+'/delete?version='+fresh.version,{});}
  await request('/auth/logout',{});
 }
});
