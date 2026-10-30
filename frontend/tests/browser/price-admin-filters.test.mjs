import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Admin filters, editable name/category and mandatory price verification',async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage();let saved;
 const row={code:'average.work.laminate',name:'Укладка ламината',title:'Работа Укладка ламината',category:'work',subcategory:'finish',status:'review',verified:false,version:1,unit:'м²',unitPriceRub:100,roughShare:0,laborShare:1,sourceNote:'Прайс',priceDate:'2026-01-01'};
 await page.route('http://prorab.test/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 if(path.startsWith('/api/')){if(route.request().method()==='PUT'){saved=route.request().postDataJSON();Object.assign(row,saved,{title:'Оборудование '+saved.name});}return route.fulfill({json:route.request().method()==='GET'?{rows:[row,{...row,code:'second',category:'material',subcategory:'rough',status:'deleted'}],missing:[]}:row});}
 const file=path==='/'?'/porabadmin/index.html':path;
 return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+file,import.meta.url))});
 });
 await page.goto('http://prorab.test/');await page.locator('[data-edit="average.work.laminate"]').waitFor();
 await page.locator('#category-filter').selectOption('work');assert.equal(await page.locator('tbody tr').count(),1);
 await page.locator('#status-filter').selectOption('deleted');assert.equal(await page.locator('tbody tr').count(),0);
 await page.locator('#status-filter').selectOption('review');await page.locator('[data-edit="average.work.laminate"]').click();
 assert.equal(await page.locator('#name').inputValue(),'Укладка ламината');assert.equal(await page.locator('#save').isDisabled(),true);
 await page.locator('#edit-category').selectOption('equipment');await page.locator('#edit-subcategory').selectOption('plumbing');await page.locator('#name').fill('Ванна');
 await page.locator('[name=verified]').check();assert.equal(await page.locator('#save').isEnabled(),true);
 await page.locator('#unitPriceRub').fill('200');assert.equal(await page.locator('#save').isDisabled(),true);
 await page.locator('[name=verified]').check();await page.locator('#save').click();await page.locator('#price-form').waitFor({state:'hidden'});
 assert.equal(saved.name,'Ванна');assert.equal(saved.category,'equipment');assert.equal(saved.subcategory,'plumbing');assert.equal(saved.verified,true);assert.equal(saved.status,'approved');
 await page.locator('#category-filter').selectOption('equipment');await page.locator('#status-filter').selectOption('approved');assert.equal(await page.locator('tbody tr').count(),1);
 for(const width of [1280,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`/tmp/prorab-admin-filters-${width}.png`,fullPage:true});}
 }finally{await browser.close();}
});
