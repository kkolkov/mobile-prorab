import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const [engineName,engine] of Object.entries({chromium,webkit}))for(const [client,url] of [['web','http://127.0.0.1:5500'],['expo','http://localhost:8081']])test(`${engineName} ${client}: rename, cancel, network error and conflict`,{timeout:90000},async()=>{
 const account=await registerAccount();
 async function api(path,body){const r=await fetch('http://localhost:8080/api'+path,{method:body?'PUT':'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();}
 const res=await fetch('http://localhost:8080/api/projects/draft',{method:'POST',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},body:JSON.stringify({areaM2:33,name:'Исходный проект'})});assert.equal(res.status,200);const p=await res.json();
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);await page.goto(url);
  const button=name=>page.getByRole('button',{name,exact:true});
  await button('Переименовать: Исходный проект').click();const name=page.getByLabel('Название проекта',{exact:true});
  await name.fill('   ');assert.equal(await button('Сохранить').isDisabled(),true);await name.fill('Отмена изменения');await button('Отмена').click();
  assert.equal((await api('/projects/'+p.projectId)).name,'Исходный проект');await button('Переименовать: Исходный проект').click();await name.fill('Моя квартира');
  await page.route('**/projects/*/name',r=>r.abort());await button('Сохранить').click();await page.getByRole('alert').filter({hasText:/./}).waitFor();assert.equal(await name.inputValue(),'Моя квартира');await page.unroute('**/projects/*/name');
  await api('/projects/'+p.projectId+'/name',{name:'Другое устройство',version:p.version});await button('Сохранить').click();await button('Загрузить актуальную версию').waitFor();assert.equal(await button('Сохранить').isDisabled(),true);
  await button('Загрузить актуальную версию').click();await page.getByText('Версия обновлена. Проверьте имя и нажмите «Сохранить».',{exact:true}).waitFor();assert.equal(await name.inputValue(),'Моя квартира');assert.equal((await api('/projects/'+p.projectId)).name,'Другое устройство');
  await button('Сохранить').click();await button('Переименовать: Моя квартира').waitFor();await page.reload();await button('Переименовать: Моя квартира').waitFor();assert.equal((await api('/projects/'+p.projectId)).name,'Моя квартира');
 }finally{await browser.close();}
});
