import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
const base=process.env.PRORAB_TEST_API||'http://localhost:8080/api';
for(const mobile of [false,true])test(`${mobile?'Expo':'Web'}: explicitly recalculate an unchanged project from current catalog`,{timeout:90000},async()=>{
 const account=await registerAccount();
 async function api(path,body,method='POST'){const r=await fetch(base+path,{method:body?method:'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
 let p=await api('/projects/draft',{areaM2:60});const path='/projects/'+p.projectId;
 p=await api(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');p=await api(path+'/steps/3',{version:p.version,targetState:'finish_only'},'PUT');p=await api(path+'/steps/5/estimate',{version:p.version,finishLevel:'budget'},'PUT');p=await api(path+'/activate?version='+p.version,{});
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await installSession(page,account);
  await page.goto(mobile?`http://localhost:8081/refinement/${p.projectId}`:`${process.env.PRORAB_TEST_FRONTEND||'http://127.0.0.1:5500/'}#project=${p.projectId}&refinement=1`);
  const recalc=page.getByRole('button',{name:'Пересчитать по текущим ценам',exact:true});
  await recalc.click();await page.getByRole('button',{name:'Посмотреть расчёт',exact:true}).waitFor();
  const first=await api(path+'/refinement');const requested=page.waitForResponse(r=>r.url().endsWith('/calculate')&&r.request().method()==='POST');await recalc.click();assert.equal((await requested).status(),200);
  let second;for(let i=0;i<100;i++){second=await api(path+'/refinement');if(second.candidateEstimate&&second.candidateEstimate.id!==first.candidateEstimate.id)break;await new Promise(r=>setTimeout(r,50));}
  assert.notEqual(first.candidateEstimate.id,second.candidateEstimate.id);
  assert.equal(p.budgetMinRub,second.project.budgetMinRub);assert.equal(first.activeEstimate.id,second.activeEstimate.id);
 }finally{await browser.close();}
});
