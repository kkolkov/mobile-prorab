import assert from 'node:assert/strict';
const base=process.env.PRORAB_TEST_API||'http://localhost:8080/api';
export async function registerAccount(){
 const response=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:'test_'+crypto.randomUUID().replaceAll('-',''),password:'Test-pass-123'})});
 const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
}
export async function installSession(page,account){await page.addInitScript(value=>{if(!localStorage.getItem('prorab.auth.v1'))localStorage.setItem('prorab.auth.v1',JSON.stringify(value));},account);}
