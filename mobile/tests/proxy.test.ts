import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRequire} from 'node:module';
const {createApiProxy}=createRequire(import.meta.url)('../dev/api-proxy.cjs');
async function listen(server:http.Server) { await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));return (server.address() as {port:number}).port; }
async function close(server:http.Server) {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}

test('Expo tunnel proxy forwards body/version/status only to the fixed local project API',async()=>{
  let calls=0;
  const upstream=http.createServer((req,res)=>{
    calls++;assert.equal(req.url,'/api/projects/test/refinement/apartment');assert.equal(req.method,'PUT');assert.equal(req.headers.origin,undefined);assert.equal(req.headers.authorization,'Bearer session-token');
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      assert.deepEqual(JSON.parse(body),{version:7,data:{areaM2:75}});res.writeHead(409,{'Content-Type':'application/json'});res.end('{"message":"Конфликт"}');
    });
  });
  const port=await listen(upstream),proxy=createApiProxy(port);
  const server=http.createServer((req,res)=>proxy(req,res,()=>{res.writeHead(418);res.end();}));const base=`http://127.0.0.1:${await listen(server)}`;
  try{
    const response=await fetch(base+'/prorab-api/projects/test/refinement/apartment',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://test.exp.direct',Authorization:'Bearer session-token'},body:JSON.stringify({version:7,data:{areaM2:75}})});
    assert.equal(response.status,409);assert.equal((await response.json()).message,'Конфликт');assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal((await fetch(base+'/prorab-api/admin')).status,404);
    assert.equal((await fetch(base+'/prorab-api/projects/test',{method:'DELETE'})).status,404);
    assert.equal((await fetch(base+'/index.bundle')).status,418);assert.equal(calls,1);
  }finally{await close(server);await close(upstream);}
});
test('Backend unavailable through tunnel returns a recoverable JSON error',async()=>{
  const temporary=http.createServer();const unused=await listen(temporary);await close(temporary);
  const proxy=createApiProxy(unused),server=http.createServer((req,res)=>proxy(req,res,()=>res.end()));
  const port=await listen(server);
  try{const response=await fetch(`http://127.0.0.1:${port}/prorab-api/projects/test`);assert.equal(response.status,502);assert.match((await response.json()).message,/Введённые данные остались/);}
  finally{await close(server);}
});
