import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateDetails} from '../js/estimate-details.js';
test('Legacy estimates keep their existing totals without fabricated itemization',()=>{
 assert.equal(estimateDetails(null),'');assert.equal(estimateDetails({pricingVersion:'legacy-demo'}),'');
});
test('Unit-price breakdown shows stored quantities, prices and assumptions with safe text',()=>{
 const html=estimateDetails({pricingVersion:'matrix-1',algorithmVersion:'unit-1',assumptions:['Без обмера'],details:{roughMaterials:20,finishMaterials:40,labor:40,lines:[{name:'<script>bad</script>',quantity:2,unit:'м²',unitPriceRub:50,coefficient:1,amountRub:100,source:'Условная ставка',priceDate:'2026-10-20'}]}});
 assert.ok(html.includes('Черновые материалы'));assert.ok(html.includes('matrix-1'));assert.ok(html.includes('Условная ставка'));assert.ok(html.includes('Без обмера'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
