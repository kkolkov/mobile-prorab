import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PRORAB_DEPLOY_URL||'http://127.0.0.1:5500';
for(const width of [1280,390])test(`Imported price catalog: search, source and retained edit at ${width}px`,async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(base+'/porabadmin/');
  await page.locator('[data-edit="average.work.laminate"]').waitFor();
  assert.equal(await page.locator('tbody tr').count(),32);
  await page.locator('#search').fill('ламинат');
  assert.equal(await page.locator('tbody tr').count(),2);
  await page.locator('tbody details').first().locator('summary').click();
  await page.getByText('Среднее арифметическое по 16 городам',{exact:false}).first().waitFor();
  await page.locator('[data-edit="average.work.laminate"]').click();
  assert.equal(await page.locator('#unitPriceRub').inputValue(),'1090.00');
  await page.locator('#unitPriceRub').fill('399');
  await page.route('**/api/porabadmin/prices/average.work.laminate',r=>r.fulfill({status:409,contentType:'application/json',body:'{"message":"Конфликт версии"}'}));
  await page.locator('#save').click();
  await page.getByText('Строка изменена в другом сеансе.',{exact:false}).waitFor();
  assert.equal(await page.locator('#unitPriceRub').inputValue(),'399');
  assert.equal(await page.locator('#save').isDisabled(),true);
  await page.locator('#cancel').click();
  await page.locator('[data-delete="average.work.laminate"]').click();
  await page.getByRole('button',{name:'Да, удалить',exact:true}).waitFor();
  await page.locator('#cancel').click();
  assert.equal(await page.locator('#price-form').count(),0);
  await page.screenshot({path:`/tmp/prorab-price-admin-${width}.png`,fullPage:true});
 }finally{await browser.close();}
});
for(const width of [1280,390])test(`Time norms: exact hours and retained conflict at ${width}px`,async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto(base+'/porabadmin/time-norms.html');await page.locator('[data-norm="laminate"]').click();
 assert.equal(await page.locator('#hours').inputValue(),'22.55');
 await page.locator('#hours').fill('30');
 await page.route('**/api/porabadmin/time-norms/laminate',r=>r.fulfill({status:409,contentType:'application/json',body:'{"message":"Конфликт версии"}'}));
 await page.locator('#norm-save').click();await page.getByText('Норма изменена в другом сеансе.',{exact:false}).waitFor();
 assert.equal(await page.locator('#hours').inputValue(),'30');assert.equal(await page.locator('#norm-save').isDisabled(),true);
 await page.locator('#norm-cancel').click();assert.equal(await page.locator('#hours').count(),0);
 assert.ok((await page.locator('[data-norm="laminate"]').boundingBox()).height<70);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`/tmp/prorab-time-norms-${width}.png`,fullPage:true});
 }finally{await browser.close();}
});
