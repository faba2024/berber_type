import fs from 'node:fs';
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.copyFileSync('server/api.mjs','dist/server/api.mjs');
fs.mkdirSync('dist/client',{recursive:true});
for(const file of ['hero.png','interior.png','reference.png'])fs.copyFileSync('dist/'+file,'dist/client/'+file);
const assets={};for(const file of ['index.html','app.js','admin.js','redesign.js','style.css','admin.css','redesign.css'])assets['/'+file]=fs.readFileSync('dist/'+file,'utf8');
fs.writeFileSync('dist/server/index.js',`import {api} from './api.mjs';\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env){const response=await api(request,env);if(response)return response;let p=new URL(request.url).pathname;if(p==='/'||p==='/admin')p='/index.html';if(assets[p])return new Response(assets[p],{headers:{'Content-Type':p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'}});return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404})}};`);
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});console.log('Worker and assets built');
