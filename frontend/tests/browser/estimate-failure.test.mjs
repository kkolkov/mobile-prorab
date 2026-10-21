import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
test('Insufficient area keeps draft, shows no fake zero budget, allows retry and activation',{timeout:60000},async()=>{
 const account=await registerAccount(),base='http://localhost:8080/api';
 async function call(path,body,method='POST'){
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${account.token}`},body:JSON.stringify(body)});
  assert.equal(r.status,200);return r.json();
 }
 let p=await call('/projects/draft',{areaM2:10});const path='/projects/'+p.projectId;
 p=await call(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');
 p=await call(path+'/steps/3',{version:p.version,targetState:'move_in_ready'},'PUT');
 p=await call(path+'/steps/5/estimate',{version:p.version,finishLevel:'comfort'},'PUT');
 assert.equal(p.estimateStatus,'failed');assert.equal(p.status,'draft');assert.equal(p.budgetMinRub,null);
 const browser=await chromium.launch();try{
  const page=await browser.newPage();await installSession(page,account);
  await page.goto('http://127.0.0.1:5500/#project='+p.projectId);
  await page.getByText('Проект создан. Сейчас не удалось рассчитать',{exact:false}).waitFor();
  assert.ok(!(await page.locator('#app').innerText()).includes('0 — 0 ₽'));
  const response=page.waitForResponse(r=>r.url().includes('/estimate?'));
  await page.getByRole('button',{name:'Повторить расчёт',exact:true}).click();assert.equal((await response).status(),200);
  await page.getByRole('alert').filter({hasText:'Повторный расчёт не выполнен'}).waitFor();
  await page.getByRole('button',{name:'Перейти в проект',exact:true}).click();
  await page.getByRole('heading',{name:'Планирование',exact:true}).waitFor();
 }finally{await browser.close();}
});
