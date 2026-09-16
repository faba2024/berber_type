import {readdir,readFile} from 'node:fs/promises';
import {connect} from '../server/turso.mjs';
const client=connect(process.env);
try{
 await client.execute('CREATE TABLE IF NOT EXISTS cloud_migrations (name TEXT PRIMARY KEY)');
 for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){
  const tx=await client.transaction('write');
  try{
   if(!(await tx.execute({sql:'SELECT name FROM cloud_migrations WHERE name=?',args:[name]})).rows.length){
    const sql=await readFile('drizzle/'+name,'utf8');
    for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await tx.execute(statement);
    await tx.execute({sql:'INSERT INTO cloud_migrations(name) VALUES(?)',args:[name]});
   }
   await tx.commit();
  }catch(e){await tx.rollback();throw e}finally{tx.close()}
 }
 console.log('Banco online atualizado.');
}finally{client.close()}
