import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
const send=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body))};
export function createLocalAuth(DB,{now=()=>Date.now()}={}) {
  const sessions=new Map();let failures=0,lockedUntil=0;
  const owner=()=>DB.prepare('SELECT data FROM records WHERE id=? AND kind=?').bind('local-owner','local-auth').first();
  const cookie=req=>String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('bp_session='))?.slice(11);
  const authenticated=req=>{const id=cookie(req),expiry=sessions.get(id);if(!expiry||expiry<=now()){if(id)sessions.delete(id);return false}return true};
  function issue(res){for(const [id,expiry] of sessions)if(expiry<=now())sessions.delete(id);const id=randomBytes(32).toString('hex');sessions.set(id,now()+8*60*60*1000);send(res,200,{authenticated:true},{'Set-Cookie':`bp_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`})}
  return {authenticated,async handle(req,res,url,rawBody){
    if(!['/api/session','/api/login','/api/setup-login','/api/logout'].includes(url.pathname))return false;
    if(url.pathname==='/api/session'&&req.method==='GET'){send(res,200,{provider:'password',configured:!!owner(),authenticated:authenticated(req)});return true}
    if(req.method!=='POST'||req.headers.origin!==url.origin){send(res,403,{error:'Requisição não permitida.'});return true}
    if(url.pathname==='/api/logout'){sessions.delete(cookie(req));send(res,200,{authenticated:false},{'Set-Cookie':'bp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return true}
    if(now()<lockedUntil){send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'});return true}
    let body;try{body=JSON.parse(rawBody.toString())}catch{send(res,400,{error:'Preencha seus dados de acesso.'});return true}
    const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
    if(url.pathname==='/api/setup-login'){
      if(owner()){send(res,409,{error:'O acesso já foi cadastrado. Faça login.'});return true}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>256){send(res,400,{error:'Informe um e-mail válido e uma senha com 10 a 256 caracteres.'});return true}
      const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
      DB.prepare('INSERT INTO records (id,kind,data,updated) VALUES (?,?,?,?)').bind('local-owner','local-auth',JSON.stringify({email,salt,hash}),now()).run();issue(res);return true;
    }
    const row=owner();const record=row?JSON.parse(row.data):null;
    const supplied=scryptSync(password.slice(0,256),record?.salt||'unconfigured',64);
    if(!record||password.length>256||email!==record.email||!timingSafeEqual(supplied,Buffer.from(record.hash,'hex'))){failures++;if(failures>=5){lockedUntil=now()+15*60*1000;failures=0}send(res,401,{error:'E-mail ou senha incorretos.'});return true}
    failures=0;issue(res);return true;
  }};
}
