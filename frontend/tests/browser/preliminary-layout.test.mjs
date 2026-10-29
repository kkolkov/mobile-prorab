import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

test('CP-06: project summary, estimate details and responsive actions',async()=>{
 const browser=await chromium.launch();
 try {
  const page=await browser.newPage();
  await page.route('http://prorab.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/app.css"><main id="app"></main>'});
   try {await route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});}
   catch {await route.fulfill({status:404,body:''});}
  });
  await page.goto('http://prorab.test/');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');
    Object.assign(state,{step:6,projectId:'test',loading:false,error:'',project:{projectId:'test',name:'Моя квартира',areaM2:73.5,roomsCount:3,bathroomsCount:2,estimateStatus:'ready',budgetMinRub:900000,budgetMaxRub:1150000,durationMinDays:90,durationMaxDays:120,estimateDetails:{details:{roughMaterials:0,finishMaterials:0,labor:0,lines:[]},assumptions:['Контрольное допущение'],pricingVersion:'test',algorithmVersion:'test'}}});
    (await import('/js/app.js')).render();
   });
   await page.getByRole('button',{name:'Детализировать параметры',exact:true}).waitFor();
   assert.equal(await page.locator('.project-parameters').textContent(),'Площадь 73.5 м² · комнаты 3 · санузлы 2');
   assert.equal(await page.getByText('Ориентировочная оценка. Цены и допущения — в составе оценки. Срок ориентировочный.',{exact:true}).count(),0);
   await page.locator('.estimate-details > summary').click();
   assert.equal(await page.getByText('Контрольное допущение',{exact:true}).isVisible(),false);
   await page.getByText('Подробности расчёта',{exact:true}).click();
   assert.equal(await page.getByText('Контрольное допущение',{exact:true}).isVisible(),true);
   const a=await page.locator('#refine').boundingBox(),b=await page.locator('#primary').boundingBox();
   if(width===1280)assert.ok(Math.abs(a.y-b.y)<2);else assert.ok(b.y>=a.y+a.height);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.evaluate(async()=>{const {state}=await import('/js/state.js');state.step=7;state.project.repairStatus='in_progress';(await import('/js/app.js')).render();});
   assert.equal(await page.locator('#repair-status').textContent(),'В работе');
   await page.locator('#status-info').focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#status-help').isVisible(),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.keyboard.press('Escape');assert.equal(await page.locator('#status-help').isVisible(),false);
  }
 }finally{await browser.close();}
});
