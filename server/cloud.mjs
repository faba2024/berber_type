import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {api} from './api.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const equal=(a,b)=>timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cookie=(token,age=28800)=>`__Host-bp_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
export function cloudHandler(DB,env,{now=Date.now}={}){
 const get=async id=>{const row=await DB.prepare('SELECT data FROM records WHERE id=?').bind(id).first();return row?JSON.parse(row.data):null};
 const put=(id,kind,data)=>DB.prepare('INSERT INTO records(id,kind,data,updated) VALUES(?,?,?,?)').bind(id,kind,JSON.stringify(data),now()).run();
 return async request=>{
  try{
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ADMIN_EMAIL||'')||(env.ADMIN_SETUP_KEY||'').length<32)return json({error:'Configure ADMIN_EMAIL e ADMIN_SETUP_KEY na hospedagem.'},503);
   const url=new URL(request.url),path=url.pathname;
   if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:'Origem não permitida.'},403);
   const token=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-bp_session=([a-f0-9]{64})(?:;|$)/)?.[1];
   const sessionId=token?'cloud-session-'+hash(token):null,session=sessionId?await get(sessionId):null;
   const authenticated=!!session&&session.expires>now()&&session.email===env.ADMIN_EMAIL.toLowerCase();
   if(path==='/api/session'&&request.method==='GET')return json({provider:'password',configured:!!await get('cloud-owner'),authenticated,setupKeyRequired:true});
   if(path==='/api/logout'&&request.method==='POST'){
    if(sessionId)await DB.prepare('DELETE FROM records WHERE id=?').bind(sessionId).run();
    return json({ok:true},200,{'Set-Cookie':cookie('',0)});
   }
   if(['/api/login','/api/setup-login'].includes(path)&&request.method==='POST'){
    const raw=await request.text();if(raw.length>10000)return json({error:'Dados muito grandes.'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'Dados inválidos.'},400)}
    // One persistent fixed-window bucket protects the sole owner account across instances.
    const bucket=Math.floor(now()/900000),rateId='cloud-rate-'+bucket;
    const rate=await DB.prepare("INSERT INTO records(id,kind,data,updated) VALUES(?,'cloud-rate','1',?) ON CONFLICT(id) DO UPDATE SET data=CAST(CAST(data AS INTEGER)+1 AS TEXT) RETURNING data").bind(rateId,now()).first();
    if(Number(rate.data)>10)return json({error:'Muitas tentativas. Aguarde até 15 minutos.'},429);
    const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    if(password.length<10||password.length>256||email!==env.ADMIN_EMAIL.toLowerCase())return json({error:'E-mail ou senha inválidos.'},401);
    let owner=await get('cloud-owner');
    if(path==='/api/setup-login'){
     if(owner)return json({error:'O acesso já foi criado. Faça login.'},409);
     if(!equal(String(body.setupKey||''),env.ADMIN_SETUP_KEY))return json({error:'Código de instalação inválido.'},403);
     const salt=randomBytes(16).toString('hex');owner={email,salt,hash:scryptSync(password,salt,64).toString('hex')};
     try{await put('cloud-owner','cloud-auth',owner)}catch(e){if(/UNIQUE|constraint/i.test(String(e)))return json({error:'O acesso já foi criado.'},409);throw e}
    }else if(!owner||owner.email!==email||!equal(scryptSync(password,owner.salt,64).toString('hex'),owner.hash))return json({error:'E-mail ou senha inválidos.'},401);
    const fresh=randomBytes(32).toString('hex');await put('cloud-session-'+hash(fresh),'cloud-session',{email,expires:now()+28800000});
    await DB.prepare("DELETE FROM records WHERE (kind='cloud-session' AND CAST(json_extract(data,'$.expires') AS INTEGER)<?) OR (kind='cloud-rate' AND updated<?)").bind(now(),now()-1800000).run();
    return json({ok:true},200,{'Set-Cookie':cookie(fresh)});
   }
   const headers=new Headers(request.headers);headers.delete('oai-authenticated-user-email');headers.delete('oai-authenticated-user-id');
   if(authenticated)headers.set('oai-authenticated-user-email',env.ADMIN_EMAIL);
   return await api(new Request(request,{headers}),{DB,ADMIN_EMAIL:env.ADMIN_EMAIL})||json({error:'Não encontrado.'},404);
  }catch{ return json({error:'Serviço indisponível. Confira a configuração do banco na hospedagem.'},503) }
 };
}
