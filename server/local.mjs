import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {api} from './api.mjs';
import {openDatabase} from './sqlite.mjs';
import {createLocalAuth} from './local-auth.mjs';
fs.mkdirSync('work',{recursive:true});
const DB=openDatabase('work/barber.sqlite');
const auth=createLocalAuth(DB);
http.createServer(async(req,res)=>{
  try {
    if(!['127.0.0.1:5173','localhost:5173'].includes(req.headers.host)){res.writeHead(403).end();return;}
    const url=new URL(req.url,'http://'+req.headers.host);
    if(url.pathname==='/baixar'&&['GET','HEAD'].includes(req.method)) {
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
      res.end('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>Baixar Barber Prime</title><body style="background:#101510;color:#f4ead8;font:18px Arial;padding:48px;max-width:700px;margin:auto"><h1>Seu projeto Barber Prime</h1><p>O botão abaixo baixa o arquivo ZIP no seu computador.</p><p><a download href="/download/barber-prime-completo.zip" style="display:inline-block;padding:18px;background:#dbb174;color:#111;border-radius:6px;text-decoration:none">Baixar projeto ZIP</a></p><p>Depois de extrair, abra INICIAR-BARBER.cmd. Requer Node.js 24 ou superior.</p><a href="/" style="color:#dbb174">Voltar ao aplicativo</a></body></html>');return;
    }
    if(url.pathname==='/download/barber-prime-completo.zip'&&['GET','HEAD'].includes(req.method)) {
      const file=path.resolve('outputs/barber-prime-completo.zip');
      if(!fs.existsSync(file)){res.writeHead(404).end('Pacote ainda não disponível.');return;}
      res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="barber-prime-completo.zip"','Content-Length':fs.statSync(file).size,'Cache-Control':'no-store'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);return;
    }
    const chunks=[];let size=0;
    for await(const chunk of req){chunks.push(chunk);size+=chunk.length;if(size>100000){res.writeHead(413).end();return;}}
    if(await auth.handle(req,res,url,Buffer.concat(chunks)))return;
    const headers=new Headers(req.headers);headers.delete('oai-authenticated-user-email');headers.delete('oai-authenticated-user-id');
    if(auth.authenticated(req))headers.set('oai-authenticated-user-email','local@preview');
    const request=new Request(url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    const response=await api(request,{DB,ADMIN_EMAIL:'local@preview'});
    if(response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
    let name=decodeURIComponent(url.pathname);if(name==='/'||name==='/admin')name='/index.html';
    const root=path.resolve('dist'),file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep)||name.startsWith('/server/')||name.startsWith('/.openai/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  } catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500);res.end('Erro no servidor');}
}).listen(5173,'127.0.0.1',()=>console.log('Barber Prime: http://127.0.0.1:5173 — Download: http://127.0.0.1:5173/baixar'));
