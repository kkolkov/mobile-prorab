import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {registerAccount,installSession} from './auth-helper.mjs';
for(const [engineName,engine] of Object.entries({chromium,webkit}))for(const [client,url] of [['web','http://127.0.0.1:5500'],['expo','http://localhost:8081']]){
 test(`${engineName} ${client}: questionnaire before CP-01; direct CP-02; desired result without details`,{timeout:90000},async()=>{
  const browser=await engine.launch();try{
   const page=await browser.newPage({viewport:{width:390,height:844}});const account=await registerAccount();await installSession(page,account);
   let creates=0,created;page.on('response',async r=>{if(r.url().endsWith('/projects/draft')&&r.ok()){creates++;created=await r.json();}});
   const button=name=>page.getByRole('button',{name,exact:true});
   const radio=name=>page.getByRole('radio',{name,exact:true});
   await page.goto(url);await button('Создать проект').click();
   await page.getByRole('heading',{name:'Расскажите о себе',exact:true}).waitFor();assert.equal(creates,0);assert.equal(await button('Продолжить').isDisabled(),true);
   await radio('Нет').click();await radio('Я сам(а)').click();await radio('Планирую').click();await button('Продолжить').click();
   await page.getByRole('heading',{name:'Об объекте',exact:true}).waitFor();assert.equal(creates,0);
   await page.getByLabel('Площадь квартиры, м²',{exact:true}).fill('33');
   await button('Назад').click();await page.getByRole('heading',{name:'Расскажите о себе',exact:true}).waitFor();
   assert.equal(await radio('Нет').getAttribute(client==='web'?'checked':'aria-checked')!==null,true);
   await button('Продолжить').click();assert.equal(await page.getByLabel('Площадь квартиры, м²',{exact:true}).inputValue(),'33');
   await page.route('**/projects/draft',r=>r.abort());await button('Продолжить').click();await page.getByText(/Не удалось связаться|Не удалось подключиться|Failed to fetch|Load failed|Ваш ввод/).first().waitFor();
   assert.equal(creates,0);await page.unroute('**/projects/draft');await button('Продолжить').click();
   await page.getByRole('heading',{name:'Текущее состояние квартиры',exact:true}).waitFor();assert.equal(creates,1);
   assert.equal(await page.getByText('Полная версия приложения',{exact:true}).count(),0);
   await page.getByRole('button',{name:/^Старая отделка/}).click();await button('Продолжить').click();
   await page.getByRole('heading',{name:'Желаемый результат ремонта',exact:true}).waitFor();assert.equal(await page.getByText('Что входит',{exact:false}).count(),0);
   const a=await fetch('http://localhost:8080/api/projects/access',{headers:{Authorization:`Bearer ${account.token}`}}).then(r=>r.json());
   assert.equal(a.questionnaireRequired,false);assert.equal(a.firstRenovation,false);assert.equal(a.renovationStage,'planning');assert.equal(a.freemiumStartedAt,null);assert.equal(a.offerShown,false);
   assert.ok(created.projectId);
   await page.goto(url);await button('Создать проект').click();await page.getByRole('heading',{name:'Расскажите о себе',exact:true}).waitFor();assert.equal(await button('Продолжить').isDisabled(),true);
  }finally{await browser.close();}
 });
}
