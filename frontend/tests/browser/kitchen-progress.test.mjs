import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Kitchen overview shows pending sibling without opening it, then clears after confirmation',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  const defaults={cabinets:'unknown',lengthM:null,facade:'unknown',countertop:'unknown',stove:null,oven:null,refrigerator:null,hood:null,dishwasher:null};
  const snapshot={project:{projectId:'kitchens',name:'Проект',version:1,targetState:'move_in_ready'},data:{apartment:{areaM2:68},rooms:[{id:'a',type:'kitchen',name:'Кухня 1'},{id:'b',type:'kitchen',name:'Кухня 2'}],kitchens:{a:{...defaults,parametersConfirmed:true},b:{...defaults}},completedSections:['kitchen'],updatedSections:[]},calculationStatus:'incomplete'};
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.includes('/api/')){
    if(route.request().method()==='PUT'){snapshot.data.kitchens=route.request().postDataJSON().data;snapshot.project.version++;}
    return route.fulfill({json:snapshot});
   }
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<main id="app"></main>'});
   return route.fulfill({contentType:'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/');
  const open=()=>page.evaluate(async()=>{window.PRORAB_API_BASE='http://prorab.test/api';await (await import('/js/refinement/app.js')).openRefinement(document.querySelector('#app'),{projectId:'kitchens',name:'Проект'},()=>{});});
  await open();
  assert.equal(await page.getByText('Выберите, какие данные хотите уточнить',{exact:true}).count(),0);
  assert.equal(await page.locator('.demo').count(),0);
  assert.equal(await page.getByRole('button',{name:'Пересчитать расчет',exact:true}).count(),1);
  assert.ok((await page.locator('body').innerText()).includes('запустите пересчет'));
  const card=page.locator('[data-open="kitchen"]');assert.match(await card.innerText(),/Есть несохранённый ввод/);
  await card.click();await page.locator('#f-selectedKitchen').selectOption('b');await page.getByRole('button',{name:'Продолжить',exact:true}).click();await card.waitFor();assert.doesNotMatch(await card.innerText(),/Есть несохранённый ввод/);
  await open();assert.doesNotMatch(await card.innerText(),/Есть несохранённый ввод/);
 }finally{await browser.close();}
});
