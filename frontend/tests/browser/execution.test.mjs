import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const [engine,type] of Object.entries({chromium,webkit}))for(const mobile of [false,true])test(`${engine} ${mobile?'Expo':'Web'}: schedule, expense persistence, failed save and cascade`,{timeout:240000},async()=>{
 const account=await registerAccount();
 async function api(path,body,method='POST'){const r=await fetch((process.env.PRORAB_TEST_API||'http://localhost:8080/api')+path,{method:body?method:'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
 let p=await api('/projects/draft',{areaM2:60});const path='/projects/'+p.projectId;
 p=await api(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');p=await api(path+'/steps/3',{version:p.version,targetState:'move_in_ready'},'PUT');p=await api(path+'/steps/5/estimate',{version:p.version,finishLevel:'budget'},'PUT');p=await api(path+'/activate?version='+p.version,{});
 const browser=await type.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=mobile?`http://localhost:8081/execution/${p.projectId}`:`${process.env.PRORAB_TEST_FRONTEND||'http://127.0.0.1:5500/'}#project=${p.projectId}&tool=schedule`;
  await page.goto(url);const button=name=>page.getByRole('button',{name,exact:true});
  async function save(){const pending=page.waitForResponse(r=>r.url().includes('/execution/')&&r.request().method()==='POST');await button('Сохранить').click();const response=await pending;assert.equal(response.status(),200,await response.text());await button('Сохранить').waitFor({state:'hidden'});}
  await button('Задать начало ремонта').click();
  await page.getByLabel(mobile?'Дата начала ремонта (ГГГГ-ММ-ДД)':'Дата начала ремонта',{exact:true}).fill('2026-01-01');await save();
  await button('Показать списком').waitFor();let s=await api(path+'/execution');assert.equal(s.totalDays,54);assert.equal(s.data.tasks.length,4);
  await button('Изменить дату начала').first().click();
  await page.getByLabel(mobile?'Дата начала ремонта (ГГГГ-ММ-ДД)':'Новая дата начала этапа',{exact:true}).fill('2025-12-30');await save();
  s=await api(path+'/execution');assert.equal(s.data.startDate,'2025-12-30');assert.equal(s.data.tasks[0].baselineStart,'2026-01-01');assert.equal(s.totalDays,54);
  const end=s.forecastEnd;await button('Продлить этап').first().click();await page.getByLabel('Добавить дней',{exact:true}).fill('3');await page.getByLabel('Причина переноса — необязательно',{exact:true}).fill('Доставка материалов');await save();await button('Показать списком').waitFor();
  s=await api(path+'/execution');assert.equal(Date.parse(s.forecastEnd)-Date.parse(end),3*86400000);
  await button('Завершить этап').click();await page.getByLabel(mobile?'Дата завершения этапа (ГГГГ-ММ-ДД)':'Дата завершения этапа',{exact:true}).fill('2026-01-20');await save();await button('Показать списком').waitFor();s=await api(path+'/execution');assert.equal(s.progressPercent,25);
  await button('Финансы').click();await button('Добавить расход').click();await page.getByLabel('Название расхода',{exact:true}).fill('Штукатурка <test>');await page.getByLabel('Сумма, ₽',{exact:true}).fill('1234.50');
  await page.route('**/execution/expense',route=>route.abort());await button('Сохранить').click();await page.getByRole('alert').filter({hasText:/./}).waitFor();assert.equal(await page.getByLabel('Название расхода',{exact:true}).inputValue(),'Штукатурка <test>');
  await page.unroute('**/execution/expense');await save();await button('Изменить').waitFor();await page.reload();
  // Expo tab is local state; select finances after reload.
  await button('Финансы').click();await button('Изменить').waitFor();s=await api(path+'/execution');assert.equal(s.spentTotal,1234.5);assert.equal(s.data.expenses.length,1);
  await button('Изменить').click();await page.getByLabel('Сумма, ₽',{exact:true}).fill('1500');
  const concurrent=await api(path+'/execution');await api(path+'/execution/shift',{version:concurrent.version,taskId:'assembly',days:1});
  const rejected=page.waitForResponse(r=>r.url().endsWith('/execution/edit-expense'));await button('Сохранить').click();assert.equal((await rejected).status(),409);
  await button('Обновить данные, сохранив ввод').click();await button('Обновить данные, сохранив ввод').waitFor({state:'hidden'});
  assert.equal(await page.getByLabel('Сумма, ₽',{exact:true}).inputValue(),'1500');await save();await button('Изменить').waitFor();assert.equal((await api(path+'/execution')).spentTotal,1500);
  await page.screenshot({path:`/tmp/prorab-${mobile?'expo':'web'}-finance-${engine}.png`,fullPage:true});
  await button('Удалить').click();await save();await button('Добавить расход').waitFor();assert.equal((await api(path+'/execution')).spentTotal,0);
  await button('График').click();await page.screenshot({path:`/tmp/prorab-${mobile?'expo':'web'}-gantt-${engine}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
