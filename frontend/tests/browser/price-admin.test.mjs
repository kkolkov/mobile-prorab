import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
// Local catalog only. Every test restores the original row, including after a failure.
const base='http://localhost:8080';
async function api(path='',body,method='PUT'){const r=await fetch(base+'/api/porabadmin/prices'+path,{method:body===undefined?'GET':method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();assert.equal(r.status,200,raw);return raw?JSON.parse(raw):null;}
for(const [name,engine] of Object.entries({chromium,webkit}))test(`${name}: public price admin saves, preserves drafts/conflicts, deletes and restores`,{timeout:90000},async()=>{
 const before=(await api()).rows.find(r=>r.code==='floor');const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/porabadmin');
  const button=name=>page.getByRole('button',{name,exact:true});await page.locator('[data-edit=floor]').click();
  await page.getByLabel('Работа + материал, ₽',{exact:true}).fill('2345.67');await page.getByLabel('Источник: ссылка / прайс, город и состав цены',{exact:true}).fill('Тестовый прайс <b>без HTML</b>, Москва, работа и материал');await page.getByLabel('Дата проверки цены',{exact:true}).fill('2026-01-01');
  await page.route('**/porabadmin/prices/floor',r=>r.abort());await button('Сохранить').click();await page.locator('#form-error').filter({hasText:/./}).waitFor();assert.equal(await page.locator('#unitPriceRub').inputValue(),'2345.67');await page.unroute('**/porabadmin/prices/floor');
  const current=(await api()).rows.find(r=>r.code==='floor');await api('/floor',{...current,unitPriceRub:current.unitPriceRub+1});
  const rejection=page.waitForResponse(r=>r.url().endsWith('/prices/floor')&&r.request().method()==='PUT');await button('Сохранить').click();assert.equal((await rejection).status(),409);
  await button('Загрузить актуальную версию, сохранив ввод').click();await button('Загрузить актуальную версию, сохранив ввод').waitFor({state:'hidden'});assert.equal(await page.locator('#unitPriceRub').inputValue(),'2345.67');
  await page.getByRole('checkbox',{name:'Цена проверена по указанному источнику',exact:true}).check();
  async function save(label='Сохранить'){const response=page.waitForResponse(r=>r.url().includes('/prices/floor')&&r.request().method()!=='GET');await button(label).click();assert.equal((await response).status(),200);await page.locator('#price-form').waitFor({state:'hidden'});}
  await save();await page.reload();await page.locator('[data-edit=floor]').waitFor();let row=(await api()).rows.find(r=>r.code==='floor');assert.equal(row.unitPriceRub,2345.67);assert.equal(row.verified,true);
  assert.ok((await page.locator('#rows').innerText()).includes('<b>без HTML</b>'));
  await page.screenshot({path:`/tmp/prorab-price-admin-${name}.png`,fullPage:true});
  await page.locator('[data-delete=floor]').click();await button('Нет').click();assert.equal((await api()).rows.length,10);
  await page.locator('[data-delete=floor]').click();await save('Да, удалить');await page.getByText('Расчёт недоступен: отсутствуют обязательные ставки.',{exact:true}).waitFor();assert.equal((await api()).missing[0].code,'floor');
  await page.locator('[data-restore=floor]').click();assert.equal(await page.locator('#unitPriceRub').inputValue(),'');
  await page.locator('#unitPriceRub').fill(String(before.unitPriceRub));await page.locator('#roughPercent').fill(String(before.roughShare*100));await page.locator('#laborPercent').fill(String(before.laborShare*100));await page.locator('#priceDate').fill(before.priceDate);await page.locator('#sourceNote').fill(before.sourceNote);await page.getByRole('checkbox').setChecked(before.verified);await save();assert.equal((await api()).missing.length,0);
  assert.equal((await fetch(base+'/api/projects')).status,401);assert.deepEqual(errors,[]);
 }finally{const current=(await api()).rows.find(r=>r.code==='floor');await api('/floor',{...before,version:current?.version??null});await browser.close();}
});
