import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Coefficient admin: retry, validation, retained edits, conflict and reopening',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  let row={code:'reserve',title:'Бюджет с резервом',description:'Максимальный бюджет × значение.',value:1.1,minimum:1,maximum:10,version:0},mode='load-error',writes=0;
  await page.route('http://prorab.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.startsWith('/api/')){
    if(mode==='load-error')return route.fulfill({status:503,json:{message:'Сервис временно недоступен'}});
    if(route.request().method()==='GET')return route.fulfill({json:[row]});
    writes++;
    if(mode==='network-error')return route.abort('failed');
    if(mode==='conflict'){row={...row,value:1.2,version:1};return route.fulfill({status:409,json:{message:'Конфликт'}});}
    const input=route.request().postDataJSON();assert.equal(input.version,row.version);
    row={...row,...input,version:row.version+1};return route.fulfill({json:row});
   }
   return route.fulfill({contentType:path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/porabadmin/coefficients.html');
  await page.getByText('Сервис временно недоступен',{exact:true}).waitFor();mode='ok';
  await page.getByRole('button',{name:'Обновить список'}).click();
  await page.getByRole('button',{name:'Изменить',exact:true}).click();
  await page.locator('#value').fill('0,9');await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  assert.equal(writes,0);assert.match(await page.locator('#error').textContent(),/Введите число/);
  await page.locator('#value').fill('1,4');mode='network-error';await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#error').textContent.length>0&&!document.querySelector('#value').disabled);
  assert.equal(await page.locator('#value').inputValue(),'1,4');
  mode='conflict';await page.getByRole('button',{name:'Сохранить',exact:true}).click();
  await page.getByRole('button',{name:'Сверить с текущей версией'}).waitFor();assert.equal(await page.getByRole('button',{name:'Сохранить',exact:true}).isDisabled(),true);
  mode='ok';await page.getByRole('button',{name:'Сверить с текущей версией'}).click();
  await page.getByText('Сейчас в базе: 1.2.',{exact:false}).waitFor();assert.equal(await page.locator('#value').inputValue(),'1,4');
  await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.getByText('Коэффициент сохранён.',{exact:false}).waitFor();assert.equal(row.value,1.4);
  await page.reload();await page.getByRole('button',{name:'Изменить',exact:true}).click();assert.equal(await page.locator('#value').inputValue(),'1.4');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/tmp/prorab-coefficients-${width}.png`,fullPage:true});
  }
 }finally{await browser.close();}
});
