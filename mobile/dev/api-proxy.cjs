const http = require('node:http');

// Development only: share the app and its project API through the same Expo tunnel.
// The upstream is fixed to this Mac; a client cannot select a host or proxy arbitrary URLs.
function createApiProxy(upstreamPort = 8080) {
  return (req, res, next) => {
    if (!req.url?.startsWith('/prorab-api/')) return next();
    const path = req.url.slice('/prorab-api'.length);
    if (!/^\/(?:projects|auth)(?:\/|\?|$)/.test(path) || !['GET', 'POST', 'PUT'].includes(req.method)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({message:'Ресурс недоступен'}));
    }
    const upstream = http.request({
      hostname:'127.0.0.1', port:upstreamPort, path:'/api'+path, method:req.method,
      headers:{'Content-Type':'application/json',Accept:'application/json',...(typeof req.headers.authorization==='string'?{Authorization:req.headers.authorization}:{})},
      timeout:15000,
    }, response => {
      res.writeHead(response.statusCode, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      response.pipe(res);
    });
    const fail = () => {
      if (!res.headersSent) {
        res.writeHead(502, {'Content-Type':'application/json'});
        res.end(JSON.stringify({message:'Backend не запущен или недоступен. Введённые данные остались в форме.'}));
      } else res.destroy();
    };
    upstream.on('error',fail);
    upstream.on('timeout',()=>upstream.destroy(new Error('Upstream timeout')));
    req.on('aborted',()=>upstream.destroy());
    req.pipe(upstream);
  };
}
module.exports = {createApiProxy};
