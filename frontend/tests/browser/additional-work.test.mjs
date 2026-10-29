import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const mobile of [false,true])test(`Additional work ${mobile?'Expo':'Web'}: zero counts, saved status, room names, deletion`,{timeout:120000},async()=>{
 const account=await registerAccount();
 async function api(path,body,method='POST'){const r=await fetch('http://localhost:8080/api'+path,{method:body?method:'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();const data=text?JSON.parse(text):null;assert.equal(r.status,200,JSON.stringify(data));return data;}
 let p=await api('/projects/draft',{areaM2:60});const path='/projects/'+p.projectId;
 p=await api(path+'/steps/2',{version:p.version,currentState:'white_box'},'PUT');
 const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  async function saveSection(section){const pending=page.waitForResponse(r=>r.url().endsWith('/refinement/'+section)&&r.request().method()==='PUT');await button('Продолжить').click();assert.equal((await pending).status(),200);await page.getByRole('heading',{name:'Уточнение параметров проекта',exact:true}).waitFor();}
  async function select(label,value,text){if(mobile){await button(label).click();await button(text).click();}else await page.getByLabel(label,{exact:true}).selectOption(value);}
  await page.goto(mobile?'http://localhost:8081/':'http://127.0.0.1:5500/#project='+p.projectId);
  if(mobile)await page.getByRole('button',{name:/^Ремонт квартиры 60 м²/}).click();
  assert.equal(await page.getByRole('button',{name:/Полностью обустроенная/}).count(),0);
  await page.getByRole('button',{name:/^Чистовая отделка/}).click();await button('Продолжить').click();
  if(mobile){await button('Уменьшить: Количество комнат').click();await button('Уменьшить: Количество санузлов').click();}
  else{await page.locator('[data-minus=k]').click();await page.locator('[data-minus=b]').click();}
  assert.ok(await button('Продолжить').isDisabled());await page.getByRole('checkbox',{name:'Ремонт будет в других помещениях?',exact:true}).click();await button('Продолжить').click();
  await page.getByRole('button',{name:/Бюджетный/}).click();await button('Получить оценку').click();await button('Перейти в проект').waitFor();
  p=await api(path);assert.equal(p.roomsCount,0);assert.equal(p.bathroomsCount,0);assert.equal(p.otherRoomsRepair,true);assert.equal(p.estimateStatus,'ready');
  await button('Удалить проект').click();await page.getByText(/Все детали по проекту будут удалены/).waitFor();await button('Нет').click();assert.equal((await api(path)).projectId,p.projectId);
  await button('Уточнить расчёт').click();await page.getByRole('heading',{name:'Уточнение параметров проекта',exact:true}).waitFor();
  const apartmentCard=()=>page.getByRole('button',{name:/^Параметры квартиры/});
  await apartmentCard().click();
  if(mobile){await button('Целевое состояние').click();assert.equal(await button('Полностью обустроенная').count(),0);await button('Закрыть').click();}
  else assert.equal(await page.locator('option[value=fully_furnished]').getAttribute('hidden'),'');
  await select('Нужна перепланировка?','true','Да');await saveSection('apartment');assert.match(await apartmentCard().innerText(),/Данные указаны/);
  await apartmentCard().click();await select('Нужна перепланировка?','false','Нет');await button('Назад').click();assert.ok((await api(path)).redevelopment);assert.ok(!(await apartmentCard().innerText()).includes('Данные указаны и обновлены'));
  await apartmentCard().click();await saveSection('apartment');assert.match(await apartmentCard().innerText(),/Данные указаны и обновлены/);assert.equal((await api(path)).redevelopment,false);
  await page.getByRole('button',{name:/^Помещения/}).click();assert.equal(await page.getByRole('heading',{name:'Жилые комнаты',exact:true}).count(),0);
  await button('+ Добавить').click();await select('Тип помещения','kitchen','Кухня');await button('Готово').click();await page.getByRole('button',{name:/^Кухня 2/}).waitFor();
  await button('+ Добавить').click();await page.getByLabel(mobile?'Название помещения · необязательно':'Название — необязательно',{exact:true}).fill('Моя мастерская');await button('Готово').click();await saveSection('rooms');
  let snapshot=await api(path+'/refinement');assert.ok(snapshot.data.rooms.some(r=>r.name==='Кухня 2'));assert.ok(snapshot.data.rooms.some(r=>r.name==='Моя мастерская'));
  await page.screenshot({path:`/tmp/prorab-additional-${mobile?'expo':'web'}.png`,fullPage:true});
  await page.goto(mobile?'http://localhost:8081/':'http://127.0.0.1:5500/');await button('Удалить: '+p.name).click();const deleted=page.waitForResponse(r=>r.url().includes('/delete?')&&r.request().method()==='POST');await button('Да').click();assert.equal((await deleted).status(),200);await button('Нет').waitFor({state:'hidden'});await page.getByRole('heading',{name:'Мои проекты',exact:true}).waitFor();
  assert.equal((await api('/projects')).length,0);
  let draft=await api('/projects/draft',{areaM2:10,name:'Удаление черновика'});const draftPath='/projects/'+draft.projectId;
  draft=await api(draftPath+'/steps/2',{version:draft.version,currentState:'old_finish'},'PUT');
  draft=await api(draftPath+'/steps/3',{version:draft.version,targetState:'finish_only'},'PUT');
  draft=await api(draftPath+'/steps/5/estimate',{version:draft.version,finishLevel:'budget'},'PUT');
  await page.reload();await page.getByRole('button',{name:/^Удаление черновика/}).click();await button('Удалить проект').click();
  const draftDeleted=page.waitForResponse(r=>r.url().includes('/delete?')&&r.request().method()==='POST');await button('Да').click();assert.equal((await draftDeleted).status(),200);
  await button('Нет').waitFor({state:'hidden'});await page.getByRole('heading',{name:'Мои проекты',exact:true}).waitFor();
  assert.equal((await api('/projects')).length,0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
