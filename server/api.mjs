const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const txt=(s,max=200)=>String(s??'').trim().slice(0,max);
const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const validTime=s=>typeof s==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
const phone=s=>{let n=String(s??'').replace(/\D/g,'');if(n.length===11)n='55'+n;return /^55[1-9]{2}9\d{8}$/.test(n)?n:null};
const defaults={name:'Barber Prime',phone:'5577981388366',address:'',open:9,close:20,reminderHours:24};
const seeds={services:[['Corte Masculino',40,45],['Barba',30,30],['Corte + Barba',60,75],['Degradê',45,50],['Sobrancelha',25,20],['Pigmentação',60,60]].map((s,i)=>({id:'service-'+i,name:s[0],price:s[1],duration:s[2],active:true,image:i})),barbers:['Rafael','Lucas','Matheus'].map((name,i)=>({id:'barber-'+i,name,commission:40,active:true})),products:[['Pomada Modeladora',49.9],['Óleo para Barba',59.9],['Shampoo 3 em 1',39.9],['Kit Cuidados',129.9],['Boné Barber Prime',79.9],['Camiseta Premium',99.9]].map((s,i)=>({id:'product-'+i,name:s[0],price:s[1],stock:0,image:i,active:true})),settings:[{id:'business',...defaults}]};
export async function api(request,env){const url=new URL(request.url),path=url.pathname,db=env.DB;
 if(!path.startsWith('/api/'))return null;
 try{
 if(!db)return json({error:'Banco de dados indisponível. Tente novamente.'},503);
 const admin=!!env.ADMIN_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();
 if(path==='/api/session'&&request.method==='GET')return json({provider:'chatgpt',configured:true,authenticated:admin});
 if(request.method!=='GET'){const origin=request.headers.get('origin');if(origin!==url.origin)return json({error:'Origem não permitida.'},403)}
 const all=async kind=>(await db.prepare('SELECT data FROM records WHERE kind = ? ORDER BY updated DESC').bind(kind).all()).results.map(r=>JSON.parse(r.data));
 const put=(kind,item)=>db.prepare('INSERT INTO records (id,kind,data,updated) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(item.id,kind,JSON.stringify(item),Date.now());
 if(path==='/api/bootstrap'&&request.method==='GET'){
 const existing=await db.prepare('SELECT id FROM records WHERE id = ?').bind('business').first();
 if(!existing){const batch=[];for(const [kind,items] of Object.entries(seeds))for(const item of items)batch.push(db.prepare('INSERT OR IGNORE INTO records (id,kind,data,updated) VALUES (?,?,?,?)').bind(item.id,kind,JSON.stringify(item),Date.now()));await db.batch(batch)}
 return json({services:(await all('services')).filter(x=>x.active).sort((a,b)=>a.image-b.image),barbers:(await all('barbers')).filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name)),products:(await all('products')).filter(x=>x.active).sort((a,b)=>a.image-b.image),settings:(await all('settings'))[0],admin,automaticWhatsApp:false})}
 if(path==='/api/availability'&&request.method==='GET'){const day=url.searchParams.get('day'),barber=txt(url.searchParams.get('barber'));if(!validDay(day))return json({error:'Data inválida.'},400);return json({busy:(await db.prepare('SELECT minute FROM slots WHERE day=? AND barber=?').bind(day,barber).all()).results.map(x=>x.minute)})}
 if(path==='/api/bookings'&&request.method==='POST'){
 const b=await request.json(),name=txt(b.name,80),tel=phone(b.phone);if(name.length<2||!tel)return json({error:'Informe nome e celular válido com DDD.'},400);
 const service=(await all('services')).find(x=>x.id===b.service&&x.active),barber=(await all('barbers')).find(x=>x.id===b.barber&&x.active),settings=(await all('settings'))[0]||defaults;
 if(!service||!barber||!validDay(b.date)||!validTime(b.time))return json({error:'Serviço, profissional ou horário inválido.'},400);
 const start=Number(b.time.slice(0,2))*60+Number(b.time.slice(3)),stamp=new Date(b.date+'T'+b.time+':00-03:00');if(!Number.isFinite(+stamp)||stamp<=new Date()||start<settings.open*60||start+service.duration>settings.close*60||start%5)return json({error:'Escolha um horário futuro dentro do expediente.'},400);
 const id=crypto.randomUUID(),record={id,name,phone:tel,consent:b.consent===true,service:service.id,serviceName:service.name,price:service.price,duration:service.duration,barber:barber.id,barberName:barber.name,commission:barber.commission,date:b.date,time:b.time,status:'Pendente',notes:txt(b.notes,500),created:Date.now()};
 const commands=[put('bookings',record)];for(let m=start;m<start+service.duration;m+=5)commands.push(db.prepare('INSERT INTO slots (booking,barber,day,minute) VALUES (?,?,?,?)').bind(id,barber.id,b.date,m));
 try{await db.batch(commands)}catch(e){if(/UNIQUE|constraint/i.test(String(e)))return json({error:'Esse horário acabou de ser ocupado. Escolha outro.'},409);throw e}return json({id,date:record.date,time:record.time,status:record.status},201)}
 if(path.startsWith('/api/admin')){
 if(!admin)return json({error:'Acesso restrito ao proprietário. Entre com a conta autorizada.'},403);
 if(path==='/api/admin'&&request.method==='GET'){const data={};for(const kind of ['bookings','services','barbers','products','expenses','settings'])data[kind]=await all(kind);return json(data)}
 if(path==='/api/admin/save'&&request.method==='POST'){
 const {kind,item}=await request.json();if(!['services','barbers','products','expenses','settings'].includes(kind))return json({error:'Cadastro inválido.'},400);const value={id:txt(item.id)||crypto.randomUUID()};
 if(kind==='settings'){Object.assign(value,{id:'business',name:txt(item.name,80),phone:phone(item.phone),address:txt(item.address),open:Number(item.open),close:Number(item.close),reminderHours:Number(item.reminderHours)});if(!value.name||!value.phone||!Number.isInteger(value.open)||!Number.isInteger(value.close)||value.open<0||value.close>24||value.open>=value.close||!Number.isInteger(value.reminderHours)||value.reminderHours<1||value.reminderHours>168)return json({error:'Informe horas inteiras de expediente e antecedência entre 1 e 168 horas.'},400)}
 else{value.name=txt(item.name,100);if(!value.name)return json({error:'Informe o nome.'},400);value.active=item.active!==false;
 if(kind==='services'||kind==='products'){value.price=Number(item.price);if(!Number.isFinite(value.price)||value.price<0)return json({error:'Preço inválido.'},400);value.image=Number.isInteger(item.image)?item.image:0}
 if(kind==='services'){value.duration=Number(item.duration);if(!Number.isInteger(value.duration)||value.duration<5||value.duration>360||value.duration%5)return json({error:'Duração deve ser múltiplo de 5 minutos.'},400)}
 if(kind==='barbers'){value.commission=Number(item.commission);if(!Number.isFinite(value.commission)||value.commission<0||value.commission>100)return json({error:'Comissão inválida.'},400)}
 if(kind==='products'){value.stock=Number(item.stock);if(!Number.isInteger(value.stock)||value.stock<0)return json({error:'Estoque inválido.'},400)}
 if(kind==='expenses'){value.amount=Number(item.amount);value.date=txt(item.date,10);value.category=txt(item.category,60);if(!Number.isFinite(value.amount)||value.amount<=0||!validDay(value.date))return json({error:'Valor ou data inválida.'},400)}}
 const old=await db.prepare('SELECT kind FROM records WHERE id=?').bind(value.id).first();if(old&&old.kind!==kind)return json({error:'Registro incompatível.'},400);await put(kind,value).run();return json({saved:true})}
 if(path==='/api/admin/status'&&request.method==='POST'){const b=await request.json();if(!['Pendente','Confirmado','Concluído','Cancelado','Não compareceu'].includes(b.status))return json({error:'Status inválido.'},400);const row=await db.prepare('SELECT data FROM records WHERE id=? AND kind=?').bind(b.id,'bookings').first();if(!row)return json({error:'Agendamento não encontrado.'},404);const item=JSON.parse(row.data);if(['Cancelado','Não compareceu'].includes(item.status)&&!['Cancelado','Não compareceu'].includes(b.status))return json({error:'Crie um novo agendamento para reagendar.'},409);item.status=b.status;const batch=[put('bookings',item)];if(['Cancelado','Não compareceu'].includes(b.status))batch.push(db.prepare('DELETE FROM slots WHERE booking=?').bind(item.id));await db.batch(batch);return json({saved:true})}
 }
 return json({error:'Operação não encontrada.'},404);
 }catch(e){console.error('API failure',e.message);return json({error:'Não foi possível concluir. Seus dados no formulário foram mantidos.'},500)}
}
