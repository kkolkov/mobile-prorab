import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const [engineName,engine] of Object.entries({chromium,webkit}))for(const [client,url] of [['web','http://127.0.0.1:5500'],['expo','http://localhost:8081']])test(`${engineName} ${client}: room count persists separately from kitchens`,{timeout:90000},async()=>{
 const account=await registerAccount();
 async function api(path,body,method='PUT'){const r=await fetch('http://localhost:8080/api'+path,{method:body?method:'GET',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();}
 let p=await api('/projects/draft',{areaM2:90,name:'Три комнаты'},'POST');
 for(const [step,body] of [[2,{currentState:'old_finish'}],[3,{targetState:'move_in_ready'}]])p=await api(`/projects/${p.projectId}/steps/${step}`,{...body,version:p.version});
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await installSession(page,account);await page.goto(url);
  await page.getByRole('button',{name:/^Три комнаты/}).click();await page.getByRole('heading',{name:'Параметры квартиры',exact:true}).waitFor();
  assert.equal(await page.getByText('Количество кухонь',{exact:true}).count(),0);await page.getByText('Количество комнат',{exact:true}).waitFor();
  const plus=client==='web'?page.locator('[data-plus="k"]'):page.getByRole('button',{name:'Увеличить: Количество комнат',exact:true});
  await plus.click();await plus.click();assert.equal((await api(`/projects/${p.projectId}`)).roomsCount,null);
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();await page.getByRole('heading',{name:'Уровень ремонта',exact:true}).waitFor();
  p=await api(`/projects/${p.projectId}`);assert.equal(p.roomsCount,3);assert.equal(p.kitchensCount,1);
  await page.goto(url);await page.getByRole('button',{name:/^Три комнаты/}).click();await page.getByRole('heading',{name:'Уровень ремонта',exact:true}).waitFor();await page.getByRole('button',{name:'Назад',exact:true}).click();
  if(client==='web')assert.equal(await page.locator('#k').textContent(),'3');else await page.getByText('3',{exact:true}).waitFor();
 }finally{await browser.close();}
});
