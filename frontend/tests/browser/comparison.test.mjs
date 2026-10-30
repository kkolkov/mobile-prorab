import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Comparison has two totals, three accordions and confirmed rejection at desktop/mobile widths',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();let discards=0;
  const snapshot={project:{projectId:'compare',name:'Проект',version:1},data:{apartment:{areaM2:68},rooms:[],kitchens:{},completedSections:[],updatedSections:[]},calculationStatus:'ready',activeEstimate:{total:{expected:1911896,withReserve:2418548}},candidateEstimate:{id:'candidate',total:{expected:1938477,withReserve:2452174}}};
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.includes('/api/')){if(path.endsWith('/discard'))discards++;return route.fulfill({json:snapshot});}
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/app.css"><main id="app"></main>'});
   return route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(async()=>{window.PRORAB_API_BASE='http://prorab.test/api';window.exited=false;await (await import('/js/refinement/app.js')).openRefinement(document.querySelector('#app'),{projectId:'compare',name:'Проект'},()=>{window.exited=true;});});
   await page.getByRole('button',{name:'Посмотреть расчет',exact:true}).click();
   assert.equal(await page.locator('.estimate-summary tbody tr').count(),2);
   assert.match((await page.locator('tbody').innerText()).replace(/\s/g,''),/\+26581₽/);
   assert.match((await page.locator('tbody').innerText()).replace(/\s/g,''),/\+33626₽/);
   assert.deepEqual(await page.locator('.estimate-details > summary').allTextContents(),['Состав оценки','Сроки выполнения работ','Дополнительно']);
   assert.equal(await page.getByText('Причины изменения',{exact:true}).count(),0);
   assert.deepEqual(await page.locator('.actions > button').allTextContents(),['Применить расчет','Отклонить расчет','Уточнить еще']);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.getByRole('button',{name:'Отклонить расчет',exact:true}).click();await page.getByRole('button',{name:'Нет',exact:true}).click();assert.equal(discards,0);
   await page.getByRole('button',{name:'Уточнить еще',exact:true}).click();await page.getByRole('heading',{name:'Уточнение параметров проекта'}).waitFor();
  }
  await page.getByRole('button',{name:'Посмотреть расчет',exact:true}).click();await page.getByRole('button',{name:'Отклонить расчет',exact:true}).click();
  await page.locator('dialog[open] [data-yes]').evaluate(b=>{b.click();b.click();});await page.waitForFunction(()=>window.exited);assert.equal(discards,1);
 }finally{await browser.close();}
});
