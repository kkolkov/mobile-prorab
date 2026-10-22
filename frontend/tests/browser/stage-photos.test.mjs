import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const [engine,type] of Object.entries({chromium,webkit}))for(const mobile of [false,true])test(`${engine} ${mobile?'Expo':'Web'}: completion photos survive errors and appear only in stage card after reload`,{timeout:120000},async()=>{
 const account=await registerAccount();
 async function api(path,body,method='POST'){const r=await fetch((process.env.PRORAB_TEST_API||'http://localhost:8080/api')+path,{method:body?method:'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
 let p=await api('/projects/draft',{areaM2:60});const path='/projects/'+p.projectId;
 p=await api(path+'/steps/2',{version:p.version,currentState:'old_finish'},'PUT');p=await api(path+'/steps/3',{version:p.version,targetState:'move_in_ready'},'PUT');p=await api(path+'/steps/5/estimate',{version:p.version,finishLevel:'budget'},'PUT');await api(path+'/activate?version='+p.version,{});
 const initial=await api(path+'/execution');await api(path+'/execution/start',{version:initial.version,date:'2026-01-01'});
 const browser=await type.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const photo={name:'stage.png',mimeType:'image/png',buffer:await page.screenshot()};
  await page.goto(mobile?`http://localhost:8081/execution/${p.projectId}`:`${process.env.PRORAB_TEST_FRONTEND||'http://localhost:5500/'}#project=${p.projectId}&tool=schedule`);
  const button=name=>page.getByRole('button',{name,exact:true});
  await button('Завершить этап').click();await page.getByLabel(mobile?'Дата завершения этапа (ГГГГ-ММ-ДД)':'Дата завершения этапа',{exact:true}).fill('2026-01-17');await page.getByLabel('Комментарий — необязательно',{exact:true}).fill('Фото результата');
  async function attach(){if(mobile){const choice=page.waitForEvent('filechooser');await button('Прикрепить фотографии').click();await (await choice).setFiles(photo);}else await page.locator('#stage-photo-input').setInputFiles(photo);await button('Удалить фото 1').waitFor();}
  await attach();await button('Удалить фото 1').click();await button('Удалить фото 1').waitFor({state:'hidden'});await attach();
  await page.route('**/execution/complete',route=>route.abort());await button('Сохранить').click();await page.getByRole('alert').filter({hasText:/./}).waitFor();assert.equal(await page.getByLabel('Комментарий — необязательно',{exact:true}).inputValue(),'Фото результата');await button('Удалить фото 1').waitFor();
  await page.unroute('**/execution/complete');const saved=page.waitForResponse(r=>r.url().endsWith('/execution/complete'));await button('Сохранить').click();assert.equal((await saved).status(),200);await button('Сохранить').waitFor({state:'hidden'});
  await button('Скрыть фотографии (1)').first().waitFor();
  let s=await api(path+'/execution');assert.equal(s.data.history.at(-1).photoIds.length,1);
  await page.reload();if(mobile)await button('История изменений').click();else await page.locator('#execution-history summary').click();
  await button('Показать фотографии (1)').first().click();await button('Скрыть фотографии (1)').first().waitFor();
  assert.equal(await button('Скрыть фотографии (1)').count(),1);
  if(!mobile)assert.equal(await page.locator('#execution-history button, #execution-history img').count(),0);
  const image=page.getByRole('img',{name:'Фото этапа 1',exact:true}).first();await image.waitFor();
  await page.waitForFunction(()=>[...document.images].some(i=>i.alt==='Фото этапа 1'&&i.complete&&i.naturalWidth>0));
  await page.screenshot({path:`/tmp/prorab-history-photos-${engine}-${mobile?'expo':'web'}.png`,fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
