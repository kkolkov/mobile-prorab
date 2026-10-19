import test from 'node:test';
import assert from 'node:assert/strict';
import {webkit,chromium} from 'playwright';
const front='http://127.0.0.1:5500/';
for(const [name,engine] of Object.entries({webkit,chromium}))test(`${name}: registration, masked password, logout, login, reload and another browser session`,{timeout:90000},async()=>{
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(front);await page.getByRole('heading',{name:'С возвращением'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Войти',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Нет аккаунта? Зарегистрироваться'}).click();
  const login='ui_'+crypto.randomUUID().replaceAll('-','');
  await page.getByLabel('Логин',{exact:true}).fill(login);await page.getByLabel('Пароль',{exact:true}).fill('Test-pass-123');
  assert.equal(await page.getByLabel('Пароль',{exact:true}).getAttribute('type'),'password');
  await page.screenshot({path:`/tmp/prorab-auth-${name}.png`,fullPage:true});
  assert.equal(await page.getByRole('button',{name:'Создать аккаунт',exact:true}).isDisabled(),true);
  await page.getByRole('link',{name:'Политика обработки персональных данных',exact:true}).click();
  await page.getByText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Назад',exact:true}).click();
  assert.equal(await page.getByLabel('Логин',{exact:true}).inputValue(),login);
  assert.equal(await page.getByRole('button',{name:'Создать аккаунт',exact:true}).isDisabled(),true);
  await page.getByRole('checkbox',{name:'Я согласен на обработку персональных данных'}).click();
  await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();await page.getByRole('heading',{name:'Мои проекты'}).waitFor();
  const token=await page.evaluate(()=>JSON.parse(localStorage.getItem('prorab.auth.v1')).token);
  const response=await fetch('http://localhost:8080/api/projects/draft',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({areaM2:47,name:'Общий проект аккаунта'})});assert.equal(response.status,200);
  await page.reload();await page.getByRole('button',{name:/Общий проект аккаунта/}).waitFor();
  await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.getByRole('heading',{name:'С возвращением'}).waitFor();
  await page.getByLabel('Логин',{exact:true}).fill(login);await page.getByLabel('Пароль',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Войти',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Неверный логин или пароль'}).waitFor();assert.equal(await page.getByLabel('Логин',{exact:true}).inputValue(),login);
  await page.getByLabel('Пароль',{exact:true}).fill('Test-pass-123');await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByRole('heading',{name:'Мои проекты'}).waitFor();
  const second=await browser.newPage();await second.goto(front);await second.getByLabel('Логин',{exact:true}).fill(login);await second.getByLabel('Пароль',{exact:true}).fill('Test-pass-123');await second.getByRole('button',{name:'Войти',exact:true}).click();
  await second.getByRole('button',{name:/Общий проект аккаунта/}).waitFor();
  const secondToken=await second.evaluate(()=>JSON.parse(localStorage.getItem('prorab.auth.v1')).token);
  await fetch('http://localhost:8080/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${secondToken}`}});
  await second.getByRole('button',{name:'Выйти',exact:true}).click();await second.getByRole('heading',{name:'С возвращением'}).waitFor();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
