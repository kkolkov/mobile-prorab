const {getDefaultConfig} = require('expo/metro-config');
const {createApiProxy} = require('./dev/api-proxy.cjs');
const config = getDefaultConfig(__dirname);
const proxy = createApiProxy();
config.server.enhanceMiddleware = middleware => (req,res,next) => proxy(req,res,()=>middleware(req,res,next));
module.exports = config;
