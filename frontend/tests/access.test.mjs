import test from 'node:test';
import assert from 'node:assert/strict';
// api.js reads only the existing web API override at module initialization.
globalThis.window={};
const {offerHtml}=await import('../js/onboarding/access.js');
test('Access: A invites explicit consent; B and expired A cannot start a trial',()=>{
 const trial=offerHtml({trialEligible:true,fullAccess:false});assert.match(trial,/Начать 7 дней бесплатно/);assert.match(trial,/Позже/);assert.doesNotMatch(trial,/id="access-primary"[^>]*disabled/);
 const b=offerHtml({trialEligible:false,fullAccess:false});assert.match(b,/id="access-primary"[^>]*disabled/);assert.match(b,/Продолжить с калькулятором/);
 assert.match(offerHtml({trialEligible:false,fullAccess:false,freemiumStartedAt:'2026-01-01'}),/Пробный период завершён/);
 assert.doesNotMatch(offerHtml({trialEligible:false,fullAccess:true,freemiumEndsAt:'2026-11-01'}),/id="access-primary"/);
 assert.match(offerHtml({trialEligible:true},true,'<script>'),/&lt;script&gt;/);
});
