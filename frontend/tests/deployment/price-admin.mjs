import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '../../node_modules/playwright/index.mjs';
const base=process.env.PRORAB_DEPLOY_URL || 'http://localhost:5500';
test('Public admin aliases load the price table and guide without changing prices',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  for(const path of ['/prorabadmin','/porabadmin']){
   await page.goto(base+path);
   await page.getByRole('heading',{name:'Справочник цен',exact:true}).waitFor();
   await page.locator('#rows tbody tr').first().waitFor();
   assert.ok(await page.locator('#rows tbody tr').count()>0);
   assert.equal(await page.locator('#error').innerText(),'');
  }
  await page.locator('a[href="/porabadmin/guide.html"]').click();
  await page.locator('h1').waitFor();
 }finally{await browser.close();}
});
