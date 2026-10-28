import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const deployment=process.env.PRORAB_DEPLOY_URL;
const clients=deployment?[['web',deployment]]:[['web','http://127.0.0.1:5500'],['expo','http://localhost:8081']];
const api=(deployment||'http://127.0.0.1:8080')+'/api';
for(const [engineName,engine] of Object.entries({chromium,webkit}))for(const [client,url] of clients){
 test(`${engineName} ${client}: change password without old password, preserve failed input`,{timeout:90000},async()=>{
  const response=await fetch(api+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:'pw_'+crypto.randomUUID().replaceAll('-',''),password:'Initial-test-123',privacyAccepted:true})});assert.equal(response.status,200);
  const account=await response.json();const browser=await engine.launch();
  try{
   const page=await browser.newPage({viewport:{width:390,height:844}});
   await page.addInitScript(value=>localStorage.setItem('prorab.auth.v1',JSON.stringify(value)),account);
   await page.goto(url);
   if(client==='web')await page.locator('#account-toggle').click();else await page.getByRole('button',{name:/Меню пользователя:/}).click();
   await page.getByRole('button',{name:'Изменить пароль',exact:true}).click();
   const input=page.getByLabel('Новый пароль',{exact:true}),save=page.getByRole('button',{name:'Сохранить',exact:true});
   await input.fill('short');assert.equal(await save.isDisabled(),true);
   assert.equal(await page.getByLabel('Старый пароль',{exact:true}).count(),0);
   let fail=true;
   await page.route('**/auth/password',async route=>{if(fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Проверка сохранения ввода'})});}else await route.continue();});
   await input.fill('Updated-test-456');await save.click();await page.getByText('Проверка сохранения ввода',{exact:true}).waitFor();assert.equal(await input.inputValue(),'Updated-test-456');
   await save.click();await page.getByText('Пароль изменён. На других устройствах потребуется войти заново.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Закрыть',exact:true}).click();
   const old=await fetch(api+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:account.login,password:'Initial-test-123'})});assert.equal(old.status,401);
   const fresh=await fetch(api+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:account.login,password:'Updated-test-456'})});assert.equal(fresh.status,200);
   const logged=await fresh.json();await fetch(api+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+logged.token}});
  }finally{await browser.close();await fetch(api+'/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+account.token}});}
 });
}
