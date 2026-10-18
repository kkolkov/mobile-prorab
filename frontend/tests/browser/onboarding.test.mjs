import {registerAccount,installSession} from './auth-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {webkit,chromium} from 'playwright';
const front='http://127.0.0.1:5500/';
const base='http://localhost:8080/api';
const button=(p,name)=>p.getByRole('button',{name,exact:true});
async function access(id){const r=await fetch(base+'/projects/access',{headers:{Authorization:`Bearer ${id}`}});assert.equal(r.status,200);return r.json();}
for(const [name,engine] of Object.entries({webkit,chromium}))test(`${name}: questionnaire return/retry, A consent and B calculator`,{timeout:90000},async()=>{
 const browser=await engine.launch();const groups=[];
 try{for(let i=0;i<2;i++){
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const account=await registerAccount();await installSession(page,account);await page.goto(front);await button(page,'Создать проект').click();await page.locator('#area').fill('33');await page.locator('#name').fill('Моя квартира 33 м²');
  await button(page,'Продолжить').click();await page.getByRole('heading',{name:'Расскажите о себе и вашем опыте ремонта'}).waitFor();
  const id=account.token;let state=await access(id);groups.push(state.userGroup);
  assert.equal(state.freemiumStartedAt,null);assert.equal(await button(page,'Продолжить').isDisabled(),true);
  await page.getByRole('radio',{name:'Нет',exact:true}).check();await button(page,'Назад').click();
  const projectId=new URLSearchParams(new URL(page.url()).hash.slice(1)).get('project');
  await page.locator('#area').fill('38');await button(page,'Продолжить').click();
  await page.getByRole('radio',{name:'Нет',exact:true}).waitFor();assert.equal(await page.getByRole('radio',{name:'Нет',exact:true}).isChecked(),true);
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('project'),projectId);
  await page.screenshot({path:`/tmp/prorab-onboarding-${name}.png`,fullPage:true});
  await page.getByRole('radio',{name:'Я сам(а)',exact:true}).check();await page.getByRole('radio',{name:'Планирую',exact:true}).check();
  await page.route('**/projects/access/answers',r=>r.abort());await button(page,'Продолжить').click();
  await page.getByRole('alert').filter({hasText:/./}).waitFor();assert.equal(await page.getByRole('radio',{name:'Планирую',exact:true}).isChecked(),true);
  await page.unroute('**/projects/access/answers');await button(page,'Продолжить').click();
  if(state.userGroup==='A'){
   await button(page,'Начать 7 дней бесплатно').waitFor();await page.screenshot({path:`/tmp/prorab-access-a-${name}.png`,fullPage:true});assert.equal((await access(id)).freemiumStartedAt,null);
   await page.route('**/projects/access/trial',r=>r.abort());await button(page,'Начать 7 дней бесплатно').click();await page.getByRole('alert').filter({hasText:/./}).waitFor();
   assert.equal((await access(id)).freemiumStartedAt,null);await page.unroute('**/projects/access/trial');
   await button(page,'Начать 7 дней бесплатно').click();await page.getByRole('heading',{name:'Полная версия активна'}).waitFor();
   state=await access(id);assert.equal(state.fullAccess,true);assert.equal(new Date(state.freemiumEndsAt)-new Date(state.freemiumStartedAt),7*86400000);
   await button(page,'Продолжить').click();
  }else{
   await button(page,'Оформить подписку').waitFor();assert.equal(await button(page,'Оформить подписку').isDisabled(),true);
   await button(page,'Продолжить с калькулятором').click();assert.equal((await access(id)).fullAccess,false);
  }
  await page.getByRole('heading',{name:'Текущее состояние квартиры'}).waitFor();await page.reload();
  await page.getByRole('heading',{name:'Текущее состояние квартиры'}).waitFor();assert.deepEqual(errors,[]);
  await page.close();
 }
 assert.deepEqual(groups.sort(),['A','B']);
 }finally{await browser.close();}
});
