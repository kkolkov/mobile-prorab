import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
for(const [engineName,engine] of Object.entries({chromium,webkit}))for(const [client,url] of [['web','http://127.0.0.1:5500'],['expo','http://localhost:8081']]){
 test(`${engineName} ${client}: explicit consent, policy return, keyboard submit and retry`,{timeout:90000},async()=>{
  const browser=await engine.launch();try{
   const page=await browser.newPage({viewport:{width:390,height:844}});const requests=[];
   await page.route('**/auth/register',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Тестовая ошибка регистрации'})});});
   await page.goto(url);await page.getByRole('button',{name:'Нет аккаунта? Зарегистрироваться'}).click();
   await page.getByLabel('Логин',{exact:true}).fill('privacy_test');await page.getByLabel('Пароль',{exact:true}).fill('Test-pass-123');
   const submit=page.getByRole('button',{name:'Создать аккаунт',exact:true});
   assert.equal(await submit.isDisabled(),true);
   await page.getByLabel('Пароль',{exact:true}).press('Enter');assert.equal(requests.length,0);
   await page.getByRole('link',{name:'Политика обработки персональных данных',exact:true}).click();
   await page.getByText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.',{exact:false}).waitFor();
   await page.getByRole('button',{name:'Назад',exact:true}).click();
   assert.equal(await page.getByLabel('Логин',{exact:true}).inputValue(),'privacy_test');
   assert.equal(await page.getByLabel('Пароль',{exact:true}).inputValue(),'Test-pass-123');
   assert.equal(await submit.isDisabled(),true);
   const check=page.getByRole('checkbox',{name:'Я согласен на обработку персональных данных'});
   await check.click();assert.equal(await submit.isEnabled(),true);
   await check.click();assert.equal(await submit.isDisabled(),true);
   await check.click();await submit.click();await page.getByText('Тестовая ошибка регистрации',{exact:false}).waitFor();
   assert.equal(requests.length,1);assert.equal(requests[0].privacyAccepted,true);
   await page.getByRole('button',{name:'Уже есть аккаунт? Войти'}).click();
   assert.equal(await page.getByRole('checkbox').count(),0);assert.equal(await page.getByRole('button',{name:'Войти',exact:true}).isEnabled(),true);
   await page.getByRole('button',{name:'Нет аккаунта? Зарегистрироваться'}).click();assert.equal(await submit.isDisabled(),true);
  }finally{await browser.close();}
 });
}
