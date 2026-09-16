import {createClient} from '@libsql/client/web';
export function database(client){
 return {prepare(sql){return {sql,args:[],bind(...args){return {...this,args}},async first(){return (await client.execute(this)).rows[0]??null},async all(){return {results:(await client.execute(this)).rows}},async run(){return client.execute(this)}}},batch(items){return client.batch(items.map(({sql,args})=>({sql,args})),'write')}};
}
export function connect(env){
 if(!/^(libsql|https):\/\//.test(env.TURSO_DATABASE_URL||'')||!env.TURSO_AUTH_TOKEN)throw Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
 return createClient({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN});
}
