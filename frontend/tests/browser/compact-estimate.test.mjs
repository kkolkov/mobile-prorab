import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Preliminary estimate: compact totals, collapsed sources and readable time at 1280/390',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.route('http://prorab.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/app.css"><main id="app" class="shell"></main>'});
   await route.fulfill({contentType:path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:950});
   await page.evaluate(async()=>{
    const {state}=await import('/js/state.js');
    const details={roughMaterials:20,finishMaterials:40,labor:40,lines:[],groups:['Черновые работы','Чистовые работы','Двери и потолки','Сантехника и кухня'].map((title,i)=>({code:String(i),title,description:'Работы и материалы',laborRub:10,materialsRub:15,totalRub:25}))};
    Object.assign(state,{step:6,projectId:'test',loading:false,error:'',project:{projectId:'test',name:'Ремонт квартиры',areaM2:60,roomsCount:2,bathroomsCount:1,estimateStatus:'ready',durationMinDays:30,durationMaxDays:36,budgetMinRub:90,budgetMaxRub:115,estimateDetails:{durationMaxDays:36,pricingVersion:'test',algorithmVersion:'test',details,assumptions:['Проверочное длинное пояснение'],timePlan:{totalDays:30,phases:[{id:'rough',durationDays:10},{id:'drying',title:'Технологическая пауза',durationDays:8},{id:'finishing',durationDays:8},{id:'assembly',durationDays:4}],workloads:[{code:'plaster_wall',title:'Штукатурка стен',phase:'rough',quantityM2:130,personHours:96,personHoursPer100m2:74}]}}}});
    (await import('/js/app.js')).render();
   });
   assert.equal(await page.locator('.estimate-summary').isVisible(),false);
   await page.locator('.cost-summary > summary').click();
   assert.equal(await page.locator('.estimate-summary tbody tr').count(),4);
   const summary=await page.locator('.estimate-overview').boundingBox(),parameters=await page.locator('.estimate-parameters').boundingBox();
   assert.ok(Math.abs(summary.width-parameters.width)<2);
   assert.equal(await page.locator('.estimate-parameters').evaluate(el=>el.parentElement.classList.contains('summary')),true);
   assert.equal(await page.locator('.estimate-summary tfoot td').last().textContent(),'100 ₽');
   assert.equal(await page.getByText('Проверочное длинное пояснение',{exact:true}).isVisible(),false);
   assert.equal(await page.getByRole('button',{name:'Уточнить параметры проекта',exact:true}).count(),1);
   const a=await page.locator('#primary').boundingBox(),b=await page.locator('#refine').boundingBox();
   if(width===1280)assert.ok(Math.abs(a.y-b.y)<2);else assert.ok(b.y>=a.y+a.height);
   await page.locator('.time-summary > summary').click();
   assert.equal(await page.getByText('Этап 1. Черновые работы',{exact:true}).isVisible(),true);
   assert.ok(await page.locator('.time-summary').textContent().then(s=>s.includes('~30–36 дн.')));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/tmp/prorab-compact-${width}.png`,fullPage:true});
   await page.locator('.time-summary > summary').click();
   await page.getByText('Дополнительно',{exact:true}).click();
   assert.equal(await page.getByRole('heading',{name:'Ограничения расчета',exact:true}).isVisible(),true);
  }
 }finally{await browser.close();}
});
