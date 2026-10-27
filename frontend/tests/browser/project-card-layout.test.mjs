import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.PRORAB_DEPLOY_URL||'http://127.0.0.1:5500';
for(const width of [1280,390])test(`Project cards: aligned layout and safe menu at ${width}px`,async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width,height:1000}});
 await page.route(base+'/',r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><link rel="stylesheet" href="/css/app.css"><main class="shell"><h1>Мои проекты</h1><div class="grid project-grid"></div></main>'}));
 await page.goto(base+'/');
 await page.evaluate(async()=>{
  const {projectCard,bindProjectCards}=await import('/js/project-card.js');
  const {deleteProject}=await import('/js/delete-project.js');
  const projects=[{projectId:'a',name:'Черновик',status:'draft',completedStep:2},{projectId:'b',name:'Квартира с длинным названием для проверки переносов',status:'active',budgetMinRub:800000,budgetMaxRub:1200000},{projectId:'c',name:'Ремонт',status:'active',budgetMinRub:700000,budgetMaxRub:900000,executionProgressPercent:25}].map(p=>({...p,updatedAt:'2026-10-27T12:00:00Z'}));
  document.querySelector('.project-grid').innerHTML=projects.map(projectCard).join('');bindProjectCards(document);
  window.opens=0;document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>window.opens++);
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteProject(projects.find(p=>p.projectId===b.dataset.delete),()=>{}));
 });
 const tiles=page.locator('.project-tile');
 for(let i=0;i<3;i++){
  const tile=tiles.nth(i);const boxes=await Promise.all(['.card','.project-progress','.project-updated','.project-card-actions'].map(s=>tile.locator(s).boundingBox()));
  for(const box of boxes){assert.ok(Math.abs(box.x-boxes[0].x)<1);assert.ok(Math.abs(box.width-boxes[0].width)<1);}
  assert.equal(Math.round((await tile.locator('.project-open').boundingBox()).height),44);
 }
 if(width===1280){const a=await tiles.nth(0).locator('.project-card-actions').boundingBox(),b=await tiles.nth(1).locator('.project-card-actions').boundingBox();assert.equal(Math.round(a.y),Math.round(b.y));}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const more=tiles.first().locator('.project-more');await more.click();assert.equal(await page.evaluate(()=>window.opens),0);await page.keyboard.press('Escape');assert.equal(await more.getAttribute('aria-expanded'),'false');
 await more.click();await page.locator('h1').click();assert.equal(await more.getAttribute('aria-expanded'),'false');
 await more.click();await tiles.first().locator('[data-delete]').click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Нет',exact:true}).click();assert.equal(await page.evaluate(()=>window.opens),0);
 await tiles.first().scrollIntoViewIfNeeded();const target=await tiles.first().locator('.project-budget').boundingBox();await page.mouse.click(target.x+10,target.y+10);assert.equal(await page.evaluate(()=>window.opens),1);
 await page.mouse.move(0,0);await page.waitForTimeout(180);await page.screenshot({path:`/tmp/prorab-cards-${width}.png`,fullPage:true});
 }finally{await browser.close();}
});
