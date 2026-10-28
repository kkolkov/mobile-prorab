import test from 'node:test';
import assert from 'node:assert/strict';
import {webkit} from '../../../frontend/node_modules/playwright/index.mjs';
test('Expo registration, reload, logout and same account in web share projects and access',{timeout:90000},async()=>{
 const browser=await webkit.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8081');await page.getByRole('heading',{name:'Вход'}).waitFor();
  await page.getByRole('button',{name:'Нет аккаунта? Зарегистрироваться'}).click();
  const login='expo_'+crypto.randomUUID().replaceAll('-','');await page.getByLabel('Логин',{exact:true}).fill(login);await page.getByLabel('Пароль',{exact:true}).fill('Test-pass-123');
  await page.screenshot({path:'/tmp/prorab-auth-expo.png',fullPage:true});
  assert.equal(await page.getByRole('button',{name:'Создать аккаунт',exact:true}).isDisabled(),true);
  await page.getByRole('link',{name:'Политика обработки персональных данных',exact:true}).click();
  await page.getByText('Оператор персональных данных — ООО «Мобильный прораб».',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Назад',exact:true}).click();
  assert.equal(await page.getByLabel('Логин',{exact:true}).inputValue(),login);
  assert.equal(await page.getByRole('button',{name:'Создать аккаунт',exact:true}).isDisabled(),true);
  await page.getByRole('checkbox',{name:'Я согласен на обработку персональных данных'}).click();
  await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();await page.getByRole('heading',{name:'Мои проекты',exact:true}).waitFor();
  const a=await page.evaluate(()=>JSON.parse(localStorage.getItem('prorab.auth.v1')));
  const draft=await fetch('http://localhost:8080/api/projects/draft',{method:'POST',headers:{Authorization:`Bearer ${a.token}`,'Content-Type':'application/json'},body:JSON.stringify({areaM2:55,name:'Проект с телефона'})});assert.equal(draft.status,200);
  await page.reload();await page.getByRole('button',{name:'Проект с телефона',exact:true}).waitFor();
  const web=await browser.newPage();await web.goto('http://127.0.0.1:5500/');await web.getByLabel('Логин',{exact:true}).fill(login);await web.getByLabel('Пароль',{exact:true}).fill('Test-pass-123');await web.getByRole('button',{name:'Войти',exact:true}).click();await web.getByRole('button',{name:/^Проект с телефона/}).waitFor();
  const b=await web.evaluate(()=>JSON.parse(localStorage.getItem('prorab.auth.v1')));assert.equal(a.userId,b.userId);assert.notEqual(a.token,b.token);
  async function access(token){const response=await fetch('http://localhost:8080/api/projects/access',{headers:{Authorization:`Bearer ${token}`}});assert.equal(response.status,200);return response.json();}
  assert.equal((await access(a.token)).userGroup,(await access(b.token)).userGroup);
  await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.getByRole('heading',{name:'Вход'}).waitFor();
  assert.equal((await fetch('http://localhost:8080/api/auth/me',{headers:{Authorization:`Bearer ${a.token}`}})).status,401);
  assert.equal((await fetch('http://localhost:8080/api/auth/me',{headers:{Authorization:`Bearer ${b.token}`}})).status,200);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
