import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Empty rooms: cancel performs no save, confirmation sends one explicit request',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});let writes=0;
  const snapshot={project:{projectId:'empty-test',name:'Проверка',version:1},data:{apartment:{areaM2:68},rooms:[{id:'first',type:'living',name:'Комната 1',areaM2:null,floor:'inherit',walls:'inherit',ceiling:'inherit',automatic:true}],roomCountManual:false,kitchens:{},completedSections:[]},calculationStatus:'idle',calculationMessage:''};
  await page.route('http://prorab.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.startsWith('/api/')){
    if(route.request().method()==='PUT'){
     writes++;const body=route.request().postDataJSON();assert.equal(body.data.generateDefaultLayout,true);assert.deepEqual(body.data.rooms,[]);
     await new Promise(resolve=>setTimeout(resolve,100));
    }
    return route.fulfill({json:snapshot});
   }
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/app.css"><main id="app"></main>'});
   try{await route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});}catch{await route.fulfill({status:404,body:''});}
  });
  await page.goto('http://prorab.test/');
  await page.evaluate(async()=>{window.PRORAB_API_BASE='http://prorab.test/api';const {openRefinement}=await import('/js/refinement/app.js');await openRefinement(document.querySelector('#app'),{projectId:'empty-test',name:'Проверка'},()=>{});});
  await page.locator('[data-open="rooms"]').click();await page.getByRole('button',{name:'Удалить Комната 1',exact:true}).click();
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.getByRole('heading',{name:'Вы не указали ни одного помещения',exact:true}).waitFor();assert.equal(writes,0);
  await page.getByRole('button',{name:'Отмена',exact:true}).click();assert.equal(writes,0);assert.equal(await page.locator('[data-room]').count(),0);
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.locator('[data-confirm]').evaluate(b=>{b.click();b.click();});
  await page.getByRole('heading',{name:'Уточнение параметров проекта',exact:true}).waitFor();assert.equal(writes,1);
 }finally{await browser.close();}
});
