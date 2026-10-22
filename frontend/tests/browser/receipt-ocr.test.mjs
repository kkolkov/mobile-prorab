import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const [engine,type] of Object.entries({chromium,webkit}))for(const mobile of [false,true])test(`${engine} ${mobile?'Expo':'Web'}: OCR suggestions require apply, receipt survives errors and persists`,{timeout:120000},async()=>{
 const account=await registerAccount();
 async function api(path,body,method='POST'){const r=await fetch((process.env.PRORAB_TEST_API||'http://localhost:8080/api')+path,{method:body?method:'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
 let p=await api('/projects/draft',{areaM2:60});const path='/projects/'+p.projectId;
 p=await api(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');p=await api(path+'/steps/3',{version:p.version,targetState:'move_in_ready'},'PUT');p=await api(path+'/steps/5/estimate',{version:p.version,finishLevel:'budget'},'PUT');await api(path+'/activate?version='+p.version,{});
 const browser=await type.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const photo={name:'receipt.png',mimeType:'image/png',buffer:await page.screenshot()};
  await page.goto(mobile?`http://localhost:8081/execution/${p.projectId}?tab=finance`:`${process.env.PRORAB_TEST_FRONTEND||'http://localhost:5500/'}#project=${p.projectId}&tool=finance`);
  const button=name=>page.getByRole('button',{name,exact:true});await button('Добавить расход').click();
  await page.getByLabel('Название расхода',{exact:true}).fill('Мой ввод');await page.getByLabel('Сумма, ₽',{exact:true}).fill('777.77');
  const ocrRoute='**/execution/receipt/recognize';await page.route(ocrRoute,r=>r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({message:'Сервис распознавания недоступен. Заполните вручную.'})}));
  if(mobile){const choice=page.waitForEvent('filechooser');await button('Распознать чек').click();await (await choice).setFiles(photo);}else{const choice=page.waitForEvent('filechooser');await button('Распознать чек').click();await (await choice).setFiles(photo);}
  await page.getByRole('alert').filter({hasText:'Сервис распознавания недоступен'}).waitFor();await button('Убрать чек').waitFor();assert.equal(await page.getByLabel('Сумма, ₽',{exact:true}).inputValue(),'777.77');
  await page.unroute(ocrRoute);await page.route(ocrRoute,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({title:'Покупка: ООО Строймагазин',amount:1234.5,date:'2025-10-22',warnings:['Проверьте данные по фотографии.']})}));
  await button('Повторить распознавание').click();await button('Заполнить из чека').waitFor();assert.equal(await page.getByLabel('Название расхода',{exact:true}).inputValue(),'Мой ввод');assert.equal((await api(path+'/execution')).data.expenses.length,0);
  await button('Заполнить из чека').click();assert.equal(await page.getByLabel('Сумма, ₽',{exact:true}).inputValue(),'1234.5');assert.equal(await page.getByLabel(mobile?'Дата расхода (ГГГГ-ММ-ДД)':'Дата расхода',{exact:true}).inputValue(),'2025-10-22');
  await page.route('**/execution/expense',r=>r.abort());await button('Сохранить').click();await page.getByRole('alert').filter({hasText:/./}).waitFor();await button('Убрать чек').waitFor();
  await page.unroute('**/execution/expense');const saved=page.waitForResponse(r=>r.url().endsWith('/execution/expense'));await button('Сохранить').click();assert.equal((await saved).status(),200);await button('Посмотреть чек').waitFor();
  await page.reload();await button('Финансы').click();await button('Посмотреть чек').click();await button('Скрыть чек').waitFor();await page.getByRole('img',{name:'Чек 1',exact:true}).waitFor();
  const state=await api(path+'/execution');assert.equal(state.data.expenses.length,1);assert.equal(state.spentTotal,1234.5);assert.ok(state.data.expenses[0].receiptPhotoId);
  await page.screenshot({path:`/tmp/prorab-receipt-${engine}-${mobile?'expo':'web'}.png`,fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
