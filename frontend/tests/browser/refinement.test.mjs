import {registerAccount,installSession} from './auth-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {webkit,chromium} from 'playwright';
const base=process.env.PRORAB_TEST_API||'http://localhost:8080/api';
const front=process.env.PRORAB_TEST_FRONTEND||'http://127.0.0.1:5500/';
let account;
async function api(path,body,method='POST'){
 if(!account)account=await registerAccount();
 const res=await fetch(base+path,body===undefined?{headers:{Authorization:`Bearer ${account.token}`}}:{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${account.token}`},body:JSON.stringify(body)});
 const data=await res.json();assert.equal(res.status,200,JSON.stringify(data));return data;
}
async function project(){
 let p=await api('/projects/draft',{areaM2:68,name:'Браузерная проверка уточнения'});
 await api('/projects/access/answers',{firstRenovation:false,renovationManager:'self',renovationStage:'planning',questionnaireVersion:'1'});
 const path='/projects/'+p.projectId;
 p=await api(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');
 p=await api(path+'/steps/3',{version:p.version,targetState:'move_in_ready'},'PUT');
 p=await api(path+'/steps/5/estimate',{version:p.version,finishLevel:'comfort'},'PUT');
 return api(path+'/activate?version='+p.version,{});
}
for(const [browserName,type] of Object.entries({webkit,chromium}))test(`${browserName}: all refinement sections, local edits, failed save, comparison and apply`,{timeout:90000},async()=>{
 const browser=await type.launch();
 try{
  const p=await project(),path='/projects/'+p.projectId+'/refinement';
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await installSession(page,account);await page.goto(front+'#project='+p.projectId);
  await page.getByRole('button',{name:'Уточнить параметры проекта',exact:true}).click();
  await page.getByRole('heading',{name:'Уточнение параметров проекта',exact:true}).waitFor();
  assert.equal(await page.locator('[data-open]').count(),4);
  const opened=await api(path);assert.deepEqual(opened.data.completedSections,[]);
  const exteriorCard=page.locator('[data-open="exteriors"]');
  assert.match(await exteriorCard.innerText(),/Не уточнено/);
  await exteriorCard.click();
  assert.equal(await page.getByLabel('Нужен ремонт?',{exact:true}).inputValue(),'no');
  assert.equal(await page.locator('[data-field="presence"]').count(),0);
  await page.getByRole('button',{name:'Назад',exact:true}).click();
  assert.match(await exteriorCard.innerText(),/Не уточнено/);
  assert.match(await exteriorCard.innerText(),/Есть несохранённый ввод/);
  await exteriorCard.click();await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await exteriorCard.getByText('Данные указаны',{exact:true}).waitFor();
  assert.doesNotMatch(await exteriorCard.innerText(),/несохранённый/);
  const confirmed=await api(path);
  assert.equal(confirmed.data.exteriors.presence,'none');
  assert.equal(confirmed.revision,opened.revision);
  await page.reload();await exteriorCard.getByText('Данные указаны',{exact:true}).waitFor();
  await page.locator('[data-open="kitchen"]').click();
  await page.locator('[data-field="cabinets"]').selectOption('keep');
  for(const key of ['stoveEnabled','oven','refrigerator','hood','dishwasher'])await page.locator(`[data-field="${key}"]`).uncheck();
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.locator('[data-open="apartment"]').click();
  await page.locator('[data-field="areaM2"]').fill('75');
  await page.locator('[data-field="ceilingHeight"]').fill('2,75');
  await page.route('**/refinement/apartment',route=>route.abort());
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Не удалось связаться'}).waitFor();
  assert.equal(await page.locator('[data-field="areaM2"]').inputValue(),'75');
  await page.unroute('**/refinement/apartment');
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.locator('[data-open="rooms"]').click();
  let saved=await api(path);assert.equal(saved.data.rooms.filter(r=>r.type==='living').length,3);assert.equal(saved.data.apartment.ceilingHeight,2.75);
  const roomId=saved.data.rooms.find(r=>r.type==='living').id;
  await page.locator(`[data-room="${roomId}"]`).click();
  await page.locator('[data-field="name"]').fill('Спальня');await page.locator('[data-field="areaM2"]').fill('20');await page.locator('[data-field="floor"]').selectOption('parquet');
  await page.getByRole('button',{name:'Готово',exact:true}).click();
  assert.equal((await api(path)).data.rooms.find(r=>r.id===roomId).areaM2,null);
  await page.getByRole('button',{name:'Назад',exact:true}).click();await page.locator('[data-open="rooms"]').click();
  assert.match(await page.locator(`[data-room="${roomId}"]`).innerText(),/Спальня/);
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.locator('[data-open="exteriors"]').click();await page.locator('[data-field="repairNeeded"]').selectOption('yes');await page.locator('[data-field="presence"]').selectOption('both');
  for(const ext of ['balcony','loggia']){
   await page.locator(`[data-field="${ext}.ceiling"]`).selectOption('none');
   await page.locator(`[data-field="${ext}.insulation"]`).selectOption('no');
   await page.locator(`[data-field="${ext}.lighting"]`).uncheck();
   await page.locator(`[data-field="${ext}.sockets"]`).uncheck();
  }
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.getByRole('button',{name:'Посмотреть расчёт',exact:true}).click();
  await page.getByRole('heading',{name:'Сравнение сметы',exact:true}).waitFor();
  assert.equal(await page.getByRole('rowheader',{name:'Расчётная стоимость',exact:true}).count(),3);
  const numbers=txt=>Number(txt.replace(/[^0-9−-]/g,''));
  for(const table of await page.locator('table').filter({has:page.getByRole('rowheader',{name:'Максимум',exact:true})}).all()){
   const max=await table.getByRole('row',{name:/^Максимум/}).locator('td').allTextContents();
   const reserve=await table.getByRole('row',{name:/^Бюджет с резервом/}).locator('td').allTextContents();
   for(let i=0;i<2;i++)if(!max[i].includes('Нет данных'))assert.equal(numbers(reserve[i]),Math.round(numbers(max[i])*1.1));
  }
  await page.getByText('Из чего складывается оценка',{exact:true}).click();
  await page.getByText('Черновые материалы:',{exact:false}).waitFor();
  assert.ok(await page.locator('.estimate-details tbody tr').count()>0);
  await page.getByText('Из чего складывается оценка',{exact:true}).click();
  await page.screenshot({path:'/tmp/prorab-refinement-'+browserName+'.png',fullPage:true});
  saved=await api(path);
  assert.equal(saved.data.exteriors.balcony.areaM2,null);assert.equal(saved.candidateEstimate.kitchen.expected,0);
  assert.equal(saved.candidateEstimate.total.expected,saved.candidateEstimate.repair.expected+saved.candidateEstimate.kitchen.expected);
  assert.equal(saved.project.budgetMinRub,p.budgetMinRub);
  assert.equal(saved.data.completedSections.length,4);
  await page.getByRole('button',{name:'Вернуться в проект',exact:true}).click();
  await page.getByRole('button',{name:'Уточнить параметры проекта',exact:true}).click();
  await page.getByRole('button',{name:'Посмотреть расчёт',exact:true}).click();
  await page.getByRole('button',{name:'Применить расчёт',exact:true}).click();
  await page.getByRole('button',{name:'Уточнить параметры проекта',exact:true}).waitFor();
  const applied=await api(path);assert.equal(applied.project.budgetMinRub,saved.candidateEstimate.total.min);
  assert.equal(applied.project.durationMinDays,p.durationMinDays);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('webkit: conflict preserves input and requires explicit retry on refreshed version',{timeout:45000},async()=>{
 const browser=await webkit.launch();try{
  const p=await project(),path='/projects/'+p.projectId+'/refinement';const page=await browser.newPage();
  await installSession(page,account);await page.goto(front+'#project='+p.projectId+'&refinement=1');
  await page.locator('[data-open="apartment"]').click();
  await page.locator('[data-field="ceilingHeight"]').fill('2,8');
  const snapshot=await api(path);const remote={...snapshot.data.apartment,ceilingHeight:3.1};
  await api(path+'/apartment',{version:snapshot.project.version,data:remote},'PUT');
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.locator('[data-action="refresh-conflict"]').waitFor();assert.equal(await page.locator('[data-field="ceilingHeight"]').inputValue(),'2,8');
  assert.equal((await api(path)).data.apartment.ceilingHeight,3.1);
  await page.locator('[data-action="refresh-conflict"]').click();
  await page.getByRole('alert').filter({hasText:'Актуальные данные загружены'}).waitFor();
  assert.equal(await page.locator('[data-field="ceilingHeight"]').inputValue(),'2,8');
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.locator('[data-open="apartment"]').waitFor();
  assert.equal((await api(path)).data.apartment.ceilingHeight,2.8);
 }finally{await browser.close();}
});
