import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Empty rooms require explicit confirmation; cancel and retry preserve input',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();let saves=0,payload;
  const snapshot={project:{projectId:'test',name:'Проект',version:1},data:{apartment:{areaM2:68},rooms:[{id:'r1',type:'living',name:'Комната 1',areaM2:null,floor:'inherit',walls:'inherit',ceiling:'inherit',automatic:true}],kitchens:{},completedSections:[],updatedSections:[]},calculationStatus:'incomplete'};
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.includes('/api/')){
    if(route.request().method()==='PUT'){saves++;payload=route.request().postDataJSON();await new Promise(r=>setTimeout(r,100));return route.abort();}
    return route.fulfill({json:snapshot});
   }
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/app.css"><main id="app"></main>'});
   return route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/');
  await page.evaluate(async()=>{window.PRORAB_API_BASE='http://prorab.test/api';await (await import('/js/refinement/app.js')).openRefinement(document.querySelector('#app'),{projectId:'test',name:'Проект'},()=>{});});
  await page.locator('[data-open="rooms"]').click();await page.locator('[data-remove]').click();
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  assert.equal(saves,0);await page.getByRole('heading',{name:'Вы не указали ни одного помещения'}).waitFor();
  await page.getByRole('button',{name:'Отмена',exact:true}).click();assert.equal(saves,0);assert.equal(await page.locator('[data-room]').count(),0);
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();
  await page.locator('dialog[open] [data-confirm]').evaluate(button=>{button.click();button.click();});
  await page.getByRole('alert').filter({hasText:'Введённые данные сохранены'}).waitFor();
  assert.equal(saves,1);assert.equal(payload.data.generateBaseLayout,true);assert.deepEqual(payload.data.rooms,[]);
  assert.equal(await page.locator('[data-room]').count(),0);
  await page.getByRole('button',{name:'Продолжить',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),1);
 }finally{await browser.close();}
});
