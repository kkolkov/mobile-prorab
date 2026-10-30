import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Project status popup does not move layout and respects schedule start',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();let startDate=null;
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/execution'))return route.fulfill({json:{data:{startDate},progressPercent:0}});
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/app.css"><main id="app" class="shell"></main>'});
   await route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/');
  const render=()=>page.evaluate(async()=>{
   const {state}=await import('/js/state.js');Object.assign(state,{step:7,projectId:'test',project:{projectId:'test',name:'Проект',status:'active'},error:''});
   (await import('/js/app.js')).render();
  });
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});await render();
   assert.deepEqual(await page.locator('.estimate-details > summary').allTextContents(),['Состав оценки','Сроки выполнения работ','Дополнительно']);
   assert.equal(await page.locator('.estimate-details[open]').count(),0);
   await page.locator('.estimate-additional > summary').click();
   assert.equal(await page.getByRole('heading',{name:'Источники цен',exact:true}).isVisible(),true);
   assert.equal(await page.getByRole('heading',{name:'Ограничения расчета',exact:true}).isVisible(),true);
   await page.locator('.estimate-additional > summary').click();
   const block=page.locator('.project-planning');const before=await block.boundingBox();
   await page.locator('#status-info').click();assert.equal(await page.locator('#status-popup').isVisible(),true);
   assert.deepEqual(await block.boundingBox(),before);
   await page.keyboard.press('Escape');assert.equal(await page.locator('#status-popup').isVisible(),false);
   const label=await block.getByText('Статус',{exact:true}).boundingBox(),value=await page.locator('#project-status').boundingBox();assert.ok(label.y+label.height<=value.y);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  startDate='2020-01-01';await render();await page.getByText('В работе',{exact:true}).waitFor();assert.equal(await page.locator('#status-info').isVisible(),false);
 }finally{await browser.close();}
});
