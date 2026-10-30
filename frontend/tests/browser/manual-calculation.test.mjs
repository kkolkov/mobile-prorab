import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
test('Refinement has one calculation action and opening the current estimate sends no calculation request',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();let calculations=0;
  const snapshot={project:{projectId:'manual',name:'Проект',version:1},data:{apartment:{areaM2:68},rooms:[],kitchens:{},completedSections:[],updatedSections:[]},calculationStatus:'not_requested',activeEstimate:{},candidateEstimate:null};
  await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.includes('/api/')){if(path.endsWith('/calculate')){calculations++;snapshot.calculationStatus='ready';snapshot.candidateEstimate={};}return route.fulfill({json:snapshot});}
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<main id="app"></main>'});
   return route.fulfill({contentType:'text/javascript',body:await readFile(new URL('../..'+path,import.meta.url))});
  });
  await page.goto('http://prorab.test/');
  const open=()=>page.evaluate(async()=>{window.PRORAB_API_BASE='http://prorab.test/api';await (await import('/js/refinement/app.js')).openRefinement(document.querySelector('#app'),{projectId:'manual',name:'Проект'},()=>{});});
  await open();await page.getByRole('button',{name:'Посмотреть расчет',exact:true}).click();await page.getByRole('heading',{name:'Текущая смета проекта'}).waitFor();assert.equal(calculations,0);
  snapshot.calculationStatus='stale';await open();assert.equal(await page.getByRole('button',{name:'Посмотреть расчет',exact:true}).count(),0);
  await page.getByRole('button',{name:'Пересчитать расчет',exact:true}).click();await page.getByRole('button',{name:'Посмотреть расчет',exact:true}).waitFor();assert.equal(calculations,1);assert.equal(await page.getByRole('button',{name:'Пересчитать расчет',exact:true}).count(),0);
  snapshot.calculationStatus='stale';snapshot.candidateEstimate=null;await open();assert.equal(await page.getByRole('button',{name:'Пересчитать расчет',exact:true}).count(),1);assert.equal(calculations,1);
  snapshot.calculationStatus='failed';await open();assert.equal(await page.getByRole('button',{name:'Пересчитать расчет',exact:true}).count(),1);
  snapshot.calculationStatus='pending';await open();assert.equal(await page.getByRole('button',{name:'Расчёт выполняется…',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'В проект',exact:true}).click();
 }finally{await browser.close();}
});
