import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateDetails} from '../js/estimate-details.js';
test('Legacy estimates keep their existing totals without fabricated itemization',()=>{
 assert.equal(estimateDetails(null),'');assert.equal(estimateDetails({pricingVersion:'legacy-demo'}),'');
});
test('Unit-price breakdown shows stored quantities, prices and assumptions with safe text',()=>{
 const html=estimateDetails({pricingVersion:'matrix-1',algorithmVersion:'unit-1',assumptions:['Без обмера'],details:{roughMaterials:20,finishMaterials:40,labor:40,lines:[{name:'<script>bad</script>',quantity:2,unit:'м²',unitPriceRub:50,coefficient:1,amountRub:100,source:'Условная ставка',priceDate:'2026-10-20'}]}});
 assert.ok(html.includes('Черновые материалы'));assert.ok(html.includes('matrix-1'));assert.ok(!html.includes('Условная ставка'));assert.ok(!html.includes('Источники ставок'));assert.ok(html.includes('Источники цен'));assert.ok(html.includes('https://lemanapro.ru/uslugi/'));assert.ok(html.includes('ГЭСН (государственные сметные нормы)'));assert.ok(!html.includes('Без обмера'));assert.ok(!html.includes('Допущения расчёта'));assert.ok(html.includes('Ограничения расчета'));assert.ok(html.includes('Технологические паузы на высыхание смесей включены.'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});

test('Compact estimate shows stored categories and keeps technical details collapsed',()=>{
 const estimate={pricingVersion:'test',assumptions:['Длинное пояснение'],details:{roughMaterials:10,finishMaterials:20,labor:40,lines:[],groups:[{code:'rough',title:'Черновые работы',description:'Демонтаж',laborRub:40,materialsRub:30,totalRub:70}]}};
 const html=estimateDetails(estimate,{compact:true});
 assert.ok(html.includes('Стоимость работ'));assert.ok(html.includes('Стоимость материалов'));assert.ok(html.includes('Черновые работы'));assert.ok(html.includes('ИТОГО'));
 assert.ok(html.indexOf('estimate-summary')<html.indexOf('<details'));
 assert.ok(html.includes('<summary>Подробности расчёта</summary>'));assert.ok(!html.includes('<details open'));
 const legacy=estimateDetails({...estimate,details:{...estimate.details,groups:null}},{compact:true});
 assert.ok(legacy.includes('нет разбивки по разделам'));assert.ok(!legacy.includes('<th scope="row">Черновые работы'));assert.ok(legacy.includes('70 ₽'));
});
