import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PRORAB_DEPLOY_URL||'http://127.0.0.1:5500';
for(const width of [1280,390])test(`Home header stays on one row at ${width}px`,async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width,height:1000}});
 await page.addInitScript(()=>localStorage.setItem('prorab.auth.v1',JSON.stringify({token:'fixture'})));
 await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;return route.fulfill({contentType:'application/json',body:JSON.stringify(path.endsWith('/auth/me')?{login:'test_user_long_name'}:path.endsWith('/projects')?[{projectId:'fixture',name:'Квартира',status:'draft',completedStep:3,updatedAt:'2026-10-27T12:00:00Z'}]:{})});});
 await page.goto(base);await page.getByRole('heading',{name:'Мои проекты',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Мои проекты',exact:true}).count(),0);
 const brand=await page.locator('#account-brand').boundingBox(),user=await page.locator('#account-toggle').boundingBox();
 assert.ok(Math.abs(brand.y+brand.height/2-user.y-user.height/2)<2);
 assert.ok(brand.x+brand.width<=user.x);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#account-toggle').click();await page.getByRole('button',{name:'Выйти',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#account-menu').isVisible(),false);
 await page.screenshot({path:`/tmp/prorab-header-${width}.png`,fullPage:true});
 }finally{await browser.close();}
});
